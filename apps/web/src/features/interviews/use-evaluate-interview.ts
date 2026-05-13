'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InterviewReportResponse } from '@ai-interview/shared';
import { evaluateInterview } from './api';
import { interviewQueryKeys } from './query-keys';

export function useEvaluateInterview() {
  const queryClient = useQueryClient();

  return useMutation<InterviewReportResponse, Error, string>({
    mutationKey: interviewQueryKeys.evaluate,
    mutationFn: evaluateInterview,
    onSuccess: (report) => {
      queryClient.setQueryData(interviewQueryKeys.report(report.interviewId), report);
    }
  });
}
