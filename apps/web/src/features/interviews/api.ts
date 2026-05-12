import {
  CreateInterviewResponseSchema,
  type CreateInterviewInput,
  type CreateInterviewResponse
} from '@ai-interview/shared';
import { createApiError } from '@/lib/api/errors';
import { getApiBaseUrl } from '@/lib/config';

export async function createInterview(input: CreateInterviewInput): Promise<CreateInterviewResponse> {
  const response = await fetch(`${getApiBaseUrl()}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return CreateInterviewResponseSchema.parse(await response.json());
}

export async function getInterview(id: string): Promise<CreateInterviewResponse> {
  const response = await fetch(`${getApiBaseUrl()}/interviews/${id}`);

  if (!response.ok) {
    throw await createApiError(response);
  }

  return CreateInterviewResponseSchema.parse(await response.json());
}
