import {
  AuthResponseSchema,
  CurrentUserResponseSchema,
  type AuthResponse,
  type AuthUser,
  type LoginInput,
  type RegisterInput
} from '@ai-interview/shared';
import { apiRequest } from '@/lib/api/client';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest(
    {
      url: '/auth/register',
      method: 'POST',
      data: input
    },
    AuthResponseSchema
  );
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest(
    {
      url: '/auth/login',
      method: 'POST',
      data: input
    },
    AuthResponseSchema
  );
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest(
    {
      url: '/auth/me',
      method: 'GET'
    },
    CurrentUserResponseSchema
  );

  return response.user;
}
