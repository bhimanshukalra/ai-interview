import { Hono } from 'hono';
import { CreateInterviewSchema } from '@ai-interview/shared';
import { createInterview } from '../services/interviews';

export const interviewRoutes = new Hono();

interviewRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const interview = createInterview(input);

  return c.json(interview, 201);
});
