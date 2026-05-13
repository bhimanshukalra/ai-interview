import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import {
  CreateInterviewResponseSchema,
  CreateInterviewSchema,
  InterviewAnswerSchema,
  InterviewAnswersResponseSchema,
  InterviewReportResponseSchema,
  SubmitAnswerSchema
} from '@ai-interview/shared';
import { createDb } from '../db/client';
import type { Env } from '../env';
import {
  createInterview,
  evaluateInterview,
  getInterview,
  getInterviewReport,
  InterviewNotReadyError,
  listInterviewAnswers,
  submitInterviewAnswer
} from '../services/interviews';

export const interviewRoutes = new Hono<Env>();

function getInterviewId(c: Context<Env>): string {
  const interviewId = c.req.param('id');

  if (!interviewId) {
    throw new Error('Interview route id parameter is missing.');
  }

  return interviewId;
}

async function requireInterviewAuth(c: Context<Env>, next: Next): Promise<Response | void> {
  if (!c.env.DATABASE_URL) {
    return c.json({ message: 'DATABASE_URL is not configured for the API.' }, 503);
  }

  if (!c.env.JWT_SECRET) {
    return c.json({ message: 'JWT_SECRET is not configured for the API.' }, 503);
  }

  const authorization = c.req.header('Authorization');
  const [scheme, token] = authorization?.split(/\s+/) ?? [];

  if (scheme !== 'Bearer' || !token) {
    return c.json({ message: 'Authorization bearer token is required.' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

    if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
      return c.json({ message: 'JWT subject is required.' }, 401);
    }

    c.set('userId', payload.sub);
  } catch {
    return c.json({ message: 'Invalid authorization token.' }, 401);
  }

  await next();
}

async function createInterviewHandler(c: Context<Env>): Promise<Response> {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const interview = await createInterview(input, c.get('userId'), createDb(c.env.DATABASE_URL), {
    provider: c.env.AI_PROVIDER,
    apiKey: c.env.AI_API_KEY,
    model: c.env.AI_MODEL,
    fallbackToMock: c.env.AI_FALLBACK_TO_MOCK === 'true'
  });

  return c.json(CreateInterviewResponseSchema.parse(interview), 201);
}

async function getInterviewHandler(c: Context<Env>): Promise<Response> {
  const interview = await getInterview(getInterviewId(c), c.get('userId'), createDb(c.env.DATABASE_URL));

  if (!interview) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(CreateInterviewResponseSchema.parse(interview));
}

async function listInterviewAnswersHandler(c: Context<Env>): Promise<Response> {
  const answers = await listInterviewAnswers(getInterviewId(c), c.get('userId'), createDb(c.env.DATABASE_URL));

  if (!answers) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(InterviewAnswersResponseSchema.parse({ answers }));
}

async function submitInterviewAnswerHandler(c: Context<Env>): Promise<Response> {
  const body = await c.req.json();
  const input = SubmitAnswerSchema.parse(body);
  const answer = await submitInterviewAnswer(getInterviewId(c), c.get('userId'), input, createDb(c.env.DATABASE_URL));

  if (!answer) {
    return c.json({ message: 'Question not found for interview' }, 404);
  }

  return c.json(InterviewAnswerSchema.parse(answer), 201);
}

async function evaluateInterviewHandler(c: Context<Env>): Promise<Response> {
  const interviewId = getInterviewId(c);
  const db = createDb(c.env.DATABASE_URL);
  const answerEvaluation = {
    provider: c.env.AI_PROVIDER,
    apiKey: c.env.AI_API_KEY,
    model: c.env.AI_MODEL,
    fallbackToMock: c.env.AI_FALLBACK_TO_MOCK === 'true'
  };

  try {
    const report = await evaluateInterview(interviewId, c.get('userId'), db, answerEvaluation);

    if (!report) {
      return c.json({ message: 'Interview not found' }, 404);
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
  const report = await getInterviewReport(getInterviewId(c), c.get('userId'), createDb(c.env.DATABASE_URL));

  if (!report) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(InterviewReportResponseSchema.parse(report));
}

interviewRoutes.use('*', requireInterviewAuth);
interviewRoutes.post('/', createInterviewHandler);
interviewRoutes.get('/:id', getInterviewHandler);
interviewRoutes.get('/:id/answers', listInterviewAnswersHandler);
interviewRoutes.post('/:id/answers', submitInterviewAnswerHandler);
interviewRoutes.post('/:id/evaluate', evaluateInterviewHandler);
interviewRoutes.get('/:id/report', getInterviewReportHandler);
