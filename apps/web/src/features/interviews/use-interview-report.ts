'use client';

import { useQuery } from '@tanstack/react-query';
import { getInterviewReport } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewReport(interviewId: string) {
  return useQuery({
    queryKey: interviewQueryKeys.report(interviewId),
    queryFn: () => getInterviewReport(interviewId),
    retry: false
  });
}
