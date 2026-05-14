import { cors } from 'hono/cors';
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../env';

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function isProduction(c: Context<Env>): boolean {
  return c.env.ENVIRONMENT === 'production';
}

function getAllowedOrigin(origin: string, c: Context<Env>): string | null {
  const configuredOrigins =
    c.env.CORS_ORIGIN?.split(',')
      .map((item: string) => item.trim())
      .filter(Boolean) ?? [];
  const allowedOrigins = isProduction(c)
    ? configuredOrigins
    : [...configuredOrigins, ...localOrigins];

  if (!origin || allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

export function createCorsMiddleware(): MiddlewareHandler<Env> {
  return cors({
    origin: getAllowedOrigin,
  });
}
