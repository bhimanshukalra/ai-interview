import axios, { type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import { getApiBaseUrl } from '@/lib/config';
import { createApiErrorFromPayload, createApiNetworkError } from './errors';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

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
