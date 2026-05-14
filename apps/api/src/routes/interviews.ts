import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import {
  CreateInterviewResponseSchema,
  CreateInterviewSchema,
  InterviewAnswerSchema,
  InterviewAnswersResponseSchema,
  InterviewReportResponseSchema,
  ListInterviewsResponseSchema,
  SubmitAnswerSchema
} from '@ai-interview/shared';
import type { AnswerEvaluationConfig } from '../ai/answer-evaluator';
import type { QuestionGenerationConfig } from '../ai/question-generator';
import { createDb, type Database } from '../db/client';
import type { Env } from '../env';
import {
  createInterview,
  evaluateInterview,
  getInterview,
  getInterviewReport,
  InterviewNotReadyError,
  listInterviewAnswers,
  listInterviews,
  submitInterviewAnswer
} from '../services/interviews';

export const interviewRoutes = new Hono<Env>();

const serviceUnavailableMessage = 'This service is not ready right now. Please try again in a few minutes.';
const signInAgainMessage = 'Please sign in again to continue.';

type InterviewRouteConfig = {
  databaseUrl: string;
  jwtSecret: string;
};

type InterviewRouteContext = {
  answerEvaluation: AnswerEvaluationConfig;
  db: Database;
  questionGeneration: QuestionGenerationConfig;
  userId: string;
};

function getInterviewRouteConfig(env: Env['Bindings']): InterviewRouteConfig | null {
  if (!env.DATABASE_URL || !env.JWT_SECRET) {
    return null;
  }

  return {
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET
  };
}

function getAiConfig(env: Env['Bindings']): QuestionGenerationConfig & AnswerEvaluationConfig {
  return {
    provider: env.AI_PROVIDER,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
    fallbackToMock: env.AI_FALLBACK_TO_MOCK === 'true'
  };
}

function getInterviewRouteContext(c: Context<Env>): InterviewRouteContext {
  const config = getInterviewRouteConfig(c.env);

  if (!config) {
    throw new Error('Interview route config is missing after auth middleware.');
  }

  const aiConfig = getAiConfig(c.env);

  return {
    answerEvaluation: aiConfig,
    db: createDb(config.databaseUrl),
    questionGeneration: aiConfig,
    userId: c.get('userId')
  };
}

function getInterviewId(c: Context<Env>): string {
  const interviewId = c.req.param('id');

  if (!interviewId) {
    throw new Error('Interview route id parameter is missing.');
  }

  return interviewId;
}

async function requireInterviewAuth(c: Context<Env>, next: Next): Promise<Response | void> {
  const config = getInterviewRouteConfig(c.env);

  if (!config) {
    return c.json({ message: serviceUnavailableMessage }, 503);
  }

  const authorization = c.req.header('Authorization');
  const [scheme, token] = authorization?.split(/\s+/) ?? [];

  if (scheme !== 'Bearer' || !token) {
    return c.json({ message: signInAgainMessage }, 401);
  }

  try {
    const payload = await verify(token, config.jwtSecret, 'HS256');

    if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
      return c.json({ message: signInAgainMessage }, 401);
    }

    c.set('userId', payload.sub);
  } catch {
    return c.json({ message: signInAgainMessage }, 401);
  }

  await next();
}

async function createInterviewHandler(c: Context<Env>): Promise<Response> {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const context = getInterviewRouteContext(c);
  const interview = await createInterview(input, context.userId, context.db, context.questionGeneration);

  return c.json(CreateInterviewResponseSchema.parse(interview), 201);
}

async function listInterviewsHandler(c: Context<Env>): Promise<Response> {
  const context = getInterviewRouteContext(c);
  const interviews = await listInterviews(context.userId, context.db);

  return c.json(ListInterviewsResponseSchema.parse({ interviews }));
}

async function getInterviewHandler(c: Context<Env>): Promise<Response> {
  const context = getInterviewRouteContext(c);
  const interview = await getInterview(getInterviewId(c), context.userId, context.db);

  if (!interview) {
    return c.json({ message: 'We could not find that interview.' }, 404);
  }

  return c.json(CreateInterviewResponseSchema.parse(interview));
}

async function listInterviewAnswersHandler(c: Context<Env>): Promise<Response> {
  const context = getInterviewRouteContext(c);
  const answers = await listInterviewAnswers(getInterviewId(c), context.userId, context.db);

  if (!answers) {
    return c.json({ message: 'We could not find that interview.' }, 404);
  }

  return c.json(InterviewAnswersResponseSchema.parse({ answers }));
}

async function submitInterviewAnswerHandler(c: Context<Env>): Promise<Response> {
  const body = await c.req.json();
  const input = SubmitAnswerSchema.parse(body);
  const context = getInterviewRouteContext(c);
  const answer = await submitInterviewAnswer(getInterviewId(c), context.userId, input, context.db);

  if (!answer) {
    return c.json({ message: 'We could not find that question.' }, 404);
  }

  return c.json(InterviewAnswerSchema.parse(answer), 201);
}

async function evaluateInterviewHandler(c: Context<Env>): Promise<Response> {
  const interviewId = getInterviewId(c);
  const context = getInterviewRouteContext(c);

  try {
    const report = await evaluateInterview(interviewId, context.userId, context.db, context.answerEvaluation);

    if (!report) {
      return c.json({ message: 'We could not find that interview.' }, 404);
    }

    return c.json(InterviewReportResponseSchema.parse(report));
  } catch (error) {
    if (error instanceof InterviewNotReadyError) {
      return c.json(
        {
          message: error.message,
          answeredQuestions: error.answeredQuestions,
          totalQuestions: error.totalQuestions
        },
        409
      );
    }

    throw error;
  }
}

async function getInterviewReportHandler(c: Context<Env>): Promise<Response> {
  const context = getInterviewRouteContext(c);
  const report = await getInterviewReport(getInterviewId(c), context.userId, context.db);

  if (!report) {
    return c.json({ message: 'We could not find that interview.' }, 404);
  }

  return c.json(InterviewReportResponseSchema.parse(report));
}

interviewRoutes.use('*', requireInterviewAuth);
interviewRoutes.post('/', createInterviewHandler);
interviewRoutes.get('/', listInterviewsHandler);
interviewRoutes.get('/:id', getInterviewHandler);
interviewRoutes.get('/:id/answers', listInterviewAnswersHandler);
interviewRoutes.post('/:id/answers', submitInterviewAnswerHandler);
interviewRoutes.post('/:id/evaluate', evaluateInterviewHandler);
interviewRoutes.get('/:id/report', getInterviewReportHandler);
