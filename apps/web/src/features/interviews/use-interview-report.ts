'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { InterviewReportResponse } from '@ai-interview/shared';
import { getInterviewReport } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewReport(interviewId: string): UseQueryResult<InterviewReportResponse> {
  function fetchInterviewReport(): Promise<InterviewReportResponse> {
    return getInterviewReport(interviewId);
  }

  return useQuery({
    queryKey: interviewQueryKeys.report(interviewId),
    queryFn: fetchInterviewReport,
    retry: false
  });
}
