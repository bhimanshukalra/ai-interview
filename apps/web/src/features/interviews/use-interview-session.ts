'use client';

import { useQuery } from '@tanstack/react-query';
import type { CreateInterviewResponse } from '@ai-interview/shared';
import { getInterview } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewSession(id: string) {
  return useQuery<CreateInterviewResponse>({
    queryKey: interviewQueryKeys.session(id),
    queryFn: () => getInterview(id),
    retry: false,
    staleTime: 30_000
  });
}
