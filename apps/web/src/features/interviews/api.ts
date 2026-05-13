import {
  InterviewAnswerSchema,
  InterviewAnswersResponseSchema,
  InterviewReportResponseSchema,
  CreateInterviewResponseSchema,
  type CreateInterviewInput,
  type CreateInterviewResponse,
  type InterviewAnswer,
  type InterviewAnswersResponse,
  type InterviewReportResponse,
  type SubmitAnswerInput
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

export async function getInterviewAnswers(interviewId: string): Promise<InterviewAnswersResponse> {
  const response = await fetch(`${getApiBaseUrl()}/interviews/${interviewId}/answers`);

  if (!response.ok) {
    throw await createApiError(response);
  }

  return InterviewAnswersResponseSchema.parse(await response.json());
}

export async function submitInterviewAnswer(
  interviewId: string,
  input: SubmitAnswerInput,
): Promise<InterviewAnswer> {
  const response = await fetch(`${getApiBaseUrl()}/interviews/${interviewId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return InterviewAnswerSchema.parse(await response.json());
}

export async function evaluateInterview(interviewId: string): Promise<InterviewReportResponse> {
  const response = await fetch(`${getApiBaseUrl()}/interviews/${interviewId}/evaluate`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return InterviewReportResponseSchema.parse(await response.json());
}

export async function getInterviewReport(interviewId: string): Promise<InterviewReportResponse> {
  const response = await fetch(`${getApiBaseUrl()}/interviews/${interviewId}/report`);

  if (!response.ok) {
    throw await createApiError(response);
  }

  return InterviewReportResponseSchema.parse(await response.json());
}
