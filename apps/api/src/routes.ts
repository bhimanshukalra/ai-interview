import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { interviewRoutes } from './routes/interviews';

const app = new Hono<Env>();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'ai-interview-api' }));
app.route('/interviews', interviewRoutes);

export default app;
