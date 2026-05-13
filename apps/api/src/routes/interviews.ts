import { Hono } from 'hono';
import { CreateInterviewSchema, SubmitAnswerSchema } from '@ai-interview/shared';
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

interviewRoutes.use('*', async (c, next) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ message: 'DATABASE_URL is not configured for the API.' }, 503);
  }

  await next();
});

interviewRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const interview = await createInterview(input, createDb(c.env.DATABASE_URL), {
    provider: c.env.AI_PROVIDER,
    apiKey: c.env.AI_API_KEY,
    model: c.env.AI_MODEL
  });

  return c.json(interview, 201);
});

interviewRoutes.get('/:id', async (c) => {
  const interview = await getInterview(c.req.param('id'), createDb(c.env.DATABASE_URL));

  if (!interview) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(interview);
});

interviewRoutes.get('/:id/answers', async (c) => {
  const answers = await listInterviewAnswers(c.req.param('id'), createDb(c.env.DATABASE_URL));

  return c.json({ answers });
});

interviewRoutes.post('/:id/answers', async (c) => {
  const body = await c.req.json();
  const input = SubmitAnswerSchema.parse(body);
  const answer = await submitInterviewAnswer(c.req.param('id'), input, createDb(c.env.DATABASE_URL));

  if (!answer) {
    return c.json({ message: 'Question not found for interview' }, 404);
  }

  return c.json(answer, 201);
});

interviewRoutes.post('/:id/evaluate', async (c) => {
  const interviewId = c.req.param('id');
  const db = createDb(c.env.DATABASE_URL);
  const answerEvaluation = {
    provider: c.env.AI_PROVIDER,
    apiKey: c.env.AI_API_KEY,
    model: c.env.AI_MODEL
  };

  try {
    const report = await evaluateInterview(interviewId, db, answerEvaluation);

    if (!report) {
      return c.json({ message: 'Interview not found' }, 404);
    }

    return c.json(report);
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
});

interviewRoutes.get('/:id/report', async (c) => {
  const report = await getInterviewReport(c.req.param('id'), createDb(c.env.DATABASE_URL));

  if (!report) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(report);
});
