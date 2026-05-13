import { z } from 'zod';

const ApiErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
  issues: z
    .array(
      z.object({
        path: z.string().optional(),
        message: z.string()
      })
    )
    .optional()
});

const genericErrorMessage = 'Something went wrong. Please try again.';
const networkErrorMessage = 'Could not connect. Check your connection and try again.';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getMessageFromPayload(payload: unknown, fallback: string): string {
  const result = ApiErrorResponseSchema.safeParse(payload);

  if (!result.success) {
    return fallback;
  }

  const issueMessage = result.data.issues
    ?.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join(' ');

  return [result.data.message ?? result.data.error, issueMessage].filter(Boolean).join(' ') || fallback;
}

export function createApiErrorFromPayload(payload: unknown, status: number): ApiError {
  return new ApiError(getMessageFromPayload(payload, genericErrorMessage), status);
}

export function createApiNetworkError(): ApiError {
  return new ApiError(networkErrorMessage, 0);
}

export function getFriendlyApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return networkErrorMessage;
    }

    if (error.status === 400) {
      return error.message || fallback;
    }

    if (error.status === 401) {
      return 'Please sign in again to continue.';
    }

    if (error.status === 403) {
      return 'You do not have access to this.';
    }

    if (error.status === 404) {
      return error.message || 'We could not find what you were looking for.';
    }

    if (error.status === 409) {
      return error.message || fallback;
    }

    if (error.status === 503) {
      return error.message || 'This service is not ready right now. Please try again in a few minutes.';
    }

    if (error.status >= 500) {
      return genericErrorMessage;
    }

    return error.message || fallback;
  }

  if (error instanceof TypeError) {
    return networkErrorMessage;
  }

  return fallback;
}
