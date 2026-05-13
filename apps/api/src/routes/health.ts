import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../env';

export const healthRoutes = new Hono<Env>();

function getHealth(c: Context<Env>): Response {
  return c.json({ ok: true, service: 'ai-interview-api' });
}

healthRoutes.get('/', getHealth);
