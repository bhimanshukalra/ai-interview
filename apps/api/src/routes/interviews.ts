import { Hono } from 'hono';
import { CreateInterviewSchema } from '@ai-interview/shared';
import { createDb } from '../db/client';
import type { Env } from '../env';
import { createInterview, getInterview } from '../services/interviews';

export const interviewRoutes = new Hono<Env>();

interviewRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const interview = await createInterview(input, createDb(c.env.DATABASE_URL));

  return c.json(interview, 201);
});

interviewRoutes.get('/:id', async (c) => {
  const interview = await getInterview(c.req.param('id'), createDb(c.env.DATABASE_URL));

  if (!interview) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(interview);
});
