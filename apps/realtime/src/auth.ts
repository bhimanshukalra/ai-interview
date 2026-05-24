import { createHmac, timingSafeEqual } from 'node:crypto';
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

const JwtHeaderSchema = z.object({
  alg: z.literal('HS256'),
  typ: z.string().optional(),
});

function decodeBase64UrlJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signJwtPayload(header: string, payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAuthToken(token: string, secret: string): AuthenticatedUser | null {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    return null;
  }

  const parsedHeader = JwtHeaderSchema.safeParse(decodeJwtPart(header));

  if (!parsedHeader.success) {
    return null;
  }

  const expectedSignature = signJwtPayload(header, payload, secret);

  if (!signaturesMatch(signature, expectedSignature)) {
    return null;
  }

  const parsedPayload = JwtPayloadSchema.safeParse(decodeJwtPart(payload));

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

function decodeJwtPart(value: string): unknown {
  try {
    return decodeBase64UrlJson(value);
  } catch {
    return null;
  }
}
