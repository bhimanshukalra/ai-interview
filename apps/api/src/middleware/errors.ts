import type { Context } from 'hono';
import { ZodError } from 'zod';
import type { Env } from '../env';
import { logError } from '../logger';

export function handleAppError(error: Error, c: Context<Env>): Response {
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
