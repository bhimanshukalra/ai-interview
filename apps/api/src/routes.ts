import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import type { Context } from 'hono';
import type { Env } from './env';
import { logError } from './logger';
import { authRoutes } from './routes/auth';
import { interviewRoutes } from './routes/interviews';

const app = new Hono<Env>();

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function getAllowedOrigin(origin: string, c: Context<Env>): string | null {
  const configuredOrigins =
    c.env.CORS_ORIGIN?.split(',').map((item: string) => item.trim()).filter(Boolean) ?? [];
  const allowedOrigins = [...configuredOrigins, ...localOrigins];

  if (!origin || allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

function getHealth(c: Context<Env>): Response {
  return c.json({ ok: true, service: 'ai-interview-api' });
}

function handleAppError(error: Error, c: Context<Env>): Response {
  if (error instanceof ZodError) {
    return c.json(
      {
        message: 'Please check your input and try again.',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      400
    );
  }

  if (error instanceof SyntaxError) {
    return c.json({ message: 'We could not understand that request.' }, 400);
  }

  logError('Unexpected API error.', error);

  return c.json({ message: 'Something went wrong. Please try again.' }, 500);
}

app.use(
  '*',
  cors({
    origin: getAllowedOrigin
  })
);

app.get('/health', getHealth);
app.route('/auth', authRoutes);
app.route('/interviews', interviewRoutes);

app.onError(handleAppError);

export default app;
