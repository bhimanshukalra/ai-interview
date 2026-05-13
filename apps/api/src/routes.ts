import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import type { Env } from './env';
import { authRoutes } from './routes/auth';
import { interviewRoutes } from './routes/interviews';

const app = new Hono<Env>();

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const configuredOrigins =
        c.env.CORS_ORIGIN?.split(',').map((item: string) => item.trim()).filter(Boolean) ?? [];
      const allowedOrigins = [...configuredOrigins, ...localOrigins];

      if (!origin || allowedOrigins.includes(origin)) {
        return origin;
      }

      return null;
    }
  })
);

app.get('/health', (c) => c.json({ ok: true, service: 'ai-interview-api' }));
app.route('/auth', authRoutes);
app.route('/interviews', interviewRoutes);

app.onError((error, c) => {
  if (error instanceof ZodError) {
    return c.json(
      {
        message: 'Invalid request input.',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      400
    );
  }

  if (error instanceof SyntaxError) {
    return c.json({ message: 'Invalid JSON request body.' }, 400);
  }

  console.error(error);

  return c.json({ message: 'Unexpected API error.' }, 500);
});

export default app;
