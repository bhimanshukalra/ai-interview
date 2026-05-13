import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import { getApiBaseUrl } from '@/lib/config';
import { createApiErrorFromPayload, createApiNetworkError } from './errors';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

const authTokenStorageKey = 'ai-interview.authToken';

function getAuthorizationHeader(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = getStoredApiAuthorizationToken();

  return token ? `Bearer ${token}` : null;
}

function applyApiRequestConfig(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  config.baseURL = getApiBaseUrl();

  const authorization = getAuthorizationHeader();

  if (authorization) {
    config.headers.set('Authorization', authorization);
  }

  return config;
}

api.interceptors.request.use(applyApiRequestConfig);

export function getStoredApiAuthorizationToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(authTokenStorageKey)?.trim() ?? null;
}

export function setApiAuthorizationToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedToken = token?.trim();

  if (normalizedToken) {
    window.localStorage.setItem(authTokenStorageKey, normalizedToken);
    return;
  }

  window.localStorage.removeItem(authTokenStorageKey);
}

export async function apiRequest<T>(
  config: AxiosRequestConfig,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<T> {
  try {
    const response = await api.request<unknown>(config);

    return schema.parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw createApiErrorFromPayload(error.response.data, error.response.status);
      }

      throw createApiNetworkError();
    }

    throw error;
  }
}
