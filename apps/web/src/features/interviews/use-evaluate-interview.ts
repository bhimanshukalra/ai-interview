'use client';

import { type QueryClient, type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InterviewReportResponse } from '@ai-interview/shared';
import { evaluateInterview } from './api';
import { interviewQueryKeys } from './query-keys';

function handleEvaluateSuccess(queryClient: QueryClient, report: InterviewReportResponse): void {
  queryClient.setQueryData(interviewQueryKeys.report(report.interviewId), report);
  void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.list });
}

export function useEvaluateInterview(): UseMutationResult<InterviewReportResponse, Error, string> {
  const queryClient = useQueryClient();

  function handleMutationSuccess(report: InterviewReportResponse): void {
    handleEvaluateSuccess(queryClient, report);
  }

  return useMutation<InterviewReportResponse, Error, string>({
    mutationKey: interviewQueryKeys.evaluate,
    mutationFn: evaluateInterview,
    onSuccess: handleMutationSuccess
  });
}
