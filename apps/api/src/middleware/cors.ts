import { cors } from 'hono/cors';
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../env';

function getAllowedOrigin(origin: string, c: Context<Env>): string | null {
  const configuredOrigins =
    c.env.CORS_ORIGIN?.split(',')
      .map((item: string) => item.trim())
      .filter(Boolean) ?? [];

  if (!origin || configuredOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

export function createCorsMiddleware(): MiddlewareHandler<Env> {
  return cors({
    origin: getAllowedOrigin,
  });
}
