import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateInterviewSchema } from '@ai-interview/shared';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'ai-interview-api' }));

app.post('/interviews', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);

  return c.json({
    id: crypto.randomUUID(),
    status: 'created',
    input,
    questions: []
  }, 201);
});

export default app;
