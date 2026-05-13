'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { CreateInterviewResponse } from '@ai-interview/shared';
import { getInterview } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewSession(id: string): UseQueryResult<CreateInterviewResponse> {
  function fetchInterviewSession(): Promise<CreateInterviewResponse> {
    return getInterview(id);
  }

  return useQuery<CreateInterviewResponse>({
    queryKey: interviewQueryKeys.session(id),
    queryFn: fetchInterviewSession,
    retry: false,
    staleTime: 30_000
  });
}
