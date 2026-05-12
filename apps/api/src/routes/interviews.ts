import { Hono } from 'hono';
import { CreateInterviewSchema } from '@ai-interview/shared';
import { createInterview, getInterview } from '../services/interviews';

export const interviewRoutes = new Hono();

interviewRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);
  const interview = createInterview(input);

  return c.json(interview, 201);
});

interviewRoutes.get('/:id', (c) => {
  const interview = getInterview(c.req.param('id'));

  if (!interview) {
    return c.json({ message: 'Interview not found' }, 404);
  }

  return c.json(interview);
});
