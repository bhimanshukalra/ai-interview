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

async function getErrorMessage(response: Response) {
  const fallback = `API request failed with status ${response.status}`;

  try {
    const payload = ApiErrorResponseSchema.safeParse(await response.json());

    if (!payload.success) {
      return fallback;
    }

    const issueMessage = payload.data.issues
      ?.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
      .join(' ');

    return [payload.data.message ?? payload.data.error, issueMessage].filter(Boolean).join(' ') || fallback;
  } catch {
    return fallback;
  }
}

export async function createApiError(response: Response) {
  return new ApiError(await getErrorMessage(response), response.status);
}

export function getFriendlyApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
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
