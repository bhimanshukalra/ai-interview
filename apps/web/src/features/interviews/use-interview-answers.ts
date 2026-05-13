'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { InterviewAnswersResponse } from '@ai-interview/shared';
import { getInterviewAnswers } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewAnswers(interviewId: string): UseQueryResult<InterviewAnswersResponse> {
  function fetchInterviewAnswers(): Promise<InterviewAnswersResponse> {
    return getInterviewAnswers(interviewId);
  }

  return useQuery({
    queryKey: interviewQueryKeys.answers(interviewId),
    queryFn: fetchInterviewAnswers,
    retry: false
  });
}
