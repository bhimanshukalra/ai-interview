import { verify } from 'jsonwebtoken';
import { z } from 'zod';

export type AuthenticatedUser = {
  email: string;
  id: string;
  name: string;
};

const JwtPayloadSchema = z.object({
  email: z.string().email(),
  exp: z.number().int(),
  name: z.string().min(1),
  sub: z.string().min(1),
});

export function verifyAuthToken(token: string, secret: string): AuthenticatedUser | null {
  const payload = verifyToken(token, secret);

  if (!payload) {
    return null;
  }

  const parsedPayload = JwtPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return null;
  }

  if (parsedPayload.data.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    email: parsedPayload.data.email,
    id: parsedPayload.data.sub,
    name: parsedPayload.data.name,
  };
}

function verifyToken(token: string, secret: string): unknown {
  try {
    return verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
