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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getMessageFromPayload(payload: unknown, fallback: string) {
  const result = ApiErrorResponseSchema.safeParse(payload);

  if (!result.success) {
    return fallback;
  }

  const issueMessage = result.data.issues
    ?.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join(' ');

  return [result.data.message ?? result.data.error, issueMessage].filter(Boolean).join(' ') || fallback;
}

export function createApiErrorFromPayload(payload: unknown, status: number) {
  return new ApiError(getMessageFromPayload(payload, `API request failed with status ${status}`), status);
}

export function createApiNetworkError() {
  return new ApiError('Could not reach the API. Make sure the local API server is running.', 0);
}

export function getFriendlyApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return error.message;
    }

    if (error.status === 503) {
      return `${error.message} Check the API environment and restart the server.`;
    }

    return error.message;
  }

  if (error instanceof TypeError) {
    return 'Could not reach the API. Make sure the local API server is running.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
