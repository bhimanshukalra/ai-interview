import { z } from 'zod';

const ApiErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional()
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getErrorMessage(response: Response) {
  const fallback = `API request failed with status ${response.status}`;

  try {
    const payload = ApiErrorResponseSchema.safeParse(await response.json());

    if (!payload.success) {
      return fallback;
    }

    return payload.data.message ?? payload.data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function createApiError(response: Response) {
  return new ApiError(await getErrorMessage(response), response.status);
}
