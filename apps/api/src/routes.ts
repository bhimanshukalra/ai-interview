import { Hono } from 'hono';
import type { Env } from './env';
import { createCorsMiddleware } from './middleware/cors';
import { handleAppError } from './middleware/errors';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { interviewRoutes } from './routes/interviews';

const app = new Hono<Env>();

app.use('*', createCorsMiddleware());
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);
app.route('/interviews', interviewRoutes);
app.onError(handleAppError);

export default app;
