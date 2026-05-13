import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { AuthResponseSchema, CurrentUserResponseSchema, LoginSchema, RegisterSchema } from '@ai-interview/shared';
import { createDb } from '../db/client';
import { users } from '../db/schema';
import type { Env } from '../env';
import { hashPassword, verifyPassword } from '../services/passwords';

export const authRoutes = new Hono<Env>();

const authTokenTtlSeconds = 60 * 60 * 24 * 7;

function getAuthConfig(env: Env['Bindings']) {
  if (!env.DATABASE_URL) {
    return { error: 'DATABASE_URL is not configured for the API.' };
  }

  if (!env.JWT_SECRET) {
    return { error: 'JWT_SECRET is not configured for the API.' };
  }

  return {
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET
  };
}

async function issueToken(user: { id: string; email: string; name: string }, secret: string) {
  const now = Math.floor(Date.now() / 1000);

  return sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp: now + authTokenTtlSeconds
    },
    secret,
    'HS256'
  );
}

async function registerUser(c: Context<Env>): Promise<Response> {
  const config = getAuthConfig(c.env);

  if ('error' in config) {
    return c.json({ message: config.error }, 503);
  }

  const input = RegisterSchema.parse(await c.req.json());
  const db = createDb(config.databaseUrl);
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);

  if (existingUser) {
    return c.json({ message: 'An account already exists for this email.' }, 409);
  }

  const user = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password)
  };

  await db.insert(users).values(user);

  return c.json(AuthResponseSchema.parse({
    token: await issueToken(user, config.jwtSecret),
    user
  }));
}

async function loginUser(c: Context<Env>): Promise<Response> {
  const config = getAuthConfig(c.env);

  if ('error' in config) {
    return c.json({ message: config.error }, 503);
  }

  const input = LoginSchema.parse(await c.req.json());
  const db = createDb(config.databaseUrl);
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return c.json({ message: 'Invalid email or password.' }, 401);
  }

  return c.json(AuthResponseSchema.parse({
    token: await issueToken(user, config.jwtSecret),
    user
  }));
}

async function getCurrentUser(c: Context<Env>): Promise<Response> {
  const config = getAuthConfig(c.env);

  if ('error' in config) {
    return c.json({ message: config.error }, 503);
  }

  const authorization = c.req.header('Authorization');
  const [scheme, token] = authorization?.split(/\s+/) ?? [];

  if (scheme !== 'Bearer' || !token) {
    return c.json({ message: 'Authorization bearer token is required.' }, 401);
  }

  try {
    const payload = await verify(token, config.jwtSecret, 'HS256');

    if (typeof payload.sub !== 'string') {
      return c.json({ message: 'Invalid authorization token.' }, 401);
    }

    const db = createDb(config.databaseUrl);
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);

    if (!user) {
      return c.json({ message: 'User not found.' }, 404);
    }

    return c.json(CurrentUserResponseSchema.parse({ user }));
  } catch {
    return c.json({ message: 'Invalid authorization token.' }, 401);
  }
}

authRoutes.post('/register', registerUser);
authRoutes.post('/login', loginUser);
authRoutes.get('/me', getCurrentUser);
