'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { ListInterviewsResponse } from '@ai-interview/shared';
import { listInterviews } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewHistory(): UseQueryResult<ListInterviewsResponse> {
  return useQuery<ListInterviewsResponse>({
    queryKey: interviewQueryKeys.list,
    queryFn: listInterviews,
    retry: false,
    staleTime: 30_000
  });
}
