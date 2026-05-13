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
import { apiRequest } from '@/lib/api/client';

export async function createInterview(input: CreateInterviewInput): Promise<CreateInterviewResponse> {
  return apiRequest(
    {
      url: '/interviews',
      method: 'POST',
      data: input
    },
    CreateInterviewResponseSchema
  );
}

export async function getInterview(id: string): Promise<CreateInterviewResponse> {
  return apiRequest(
    {
      url: `/interviews/${id}`,
      method: 'GET'
    },
    CreateInterviewResponseSchema
  );
}

export async function getInterviewAnswers(interviewId: string): Promise<InterviewAnswersResponse> {
  return apiRequest(
    {
      url: `/interviews/${interviewId}/answers`,
      method: 'GET'
    },
    InterviewAnswersResponseSchema
  );
}

export async function submitInterviewAnswer(
  interviewId: string,
  input: SubmitAnswerInput,
): Promise<InterviewAnswer> {
  return apiRequest(
    {
      url: `/interviews/${interviewId}/answers`,
      method: 'POST',
      data: input
    },
    InterviewAnswerSchema
  );
}

export async function evaluateInterview(interviewId: string): Promise<InterviewReportResponse> {
  return apiRequest(
    {
      url: `/interviews/${interviewId}/evaluate`,
      method: 'POST'
    },
    InterviewReportResponseSchema
  );
}

export async function getInterviewReport(interviewId: string): Promise<InterviewReportResponse> {
  return apiRequest(
    {
      url: `/interviews/${interviewId}/report`,
      method: 'GET'
    },
    InterviewReportResponseSchema
  );
}
