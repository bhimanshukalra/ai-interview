import { z } from 'zod';

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string()
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128)
});

export const LoginSchema = z.object({
  email: z.string().trim().email().max(120).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128)
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema
});

export const CurrentUserResponseSchema = z.object({
  user: AuthUserSchema
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
