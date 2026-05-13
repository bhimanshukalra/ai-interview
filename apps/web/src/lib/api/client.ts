import axios, { type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import { getApiBaseUrl, getAuthToken } from '@/lib/config';
import { createApiErrorFromPayload, createApiNetworkError } from './errors';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

const authTokenStorageKey = 'ai-interview.authToken';

function getAuthorizationHeader() {
  const configuredToken = getAuthToken()?.trim();

  if (typeof window === 'undefined') {
    return configuredToken ? `Bearer ${configuredToken}` : null;
  }

  const token = window.localStorage.getItem(authTokenStorageKey)?.trim() ?? configuredToken;

  return token ? `Bearer ${token}` : null;
}

api.interceptors.request.use((config) => {
  const authorization = getAuthorizationHeader();

  if (authorization) {
    config.headers.set('Authorization', authorization);
  }

  return config;
});

export function setApiAuthorizationToken(token: string | null) {
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
