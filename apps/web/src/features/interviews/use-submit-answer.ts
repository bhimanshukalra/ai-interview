'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InterviewAnswer, SubmitAnswerInput } from '@ai-interview/shared';
import { submitInterviewAnswer } from './api';
import { interviewQueryKeys } from './query-keys';

type SubmitAnswerVariables = {
  interviewId: string;
  input: SubmitAnswerInput;
};

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation<InterviewAnswer, Error, SubmitAnswerVariables>({
    mutationKey: interviewQueryKeys.submitAnswer,
    mutationFn: ({ interviewId, input }) => submitInterviewAnswer(interviewId, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.answers(variables.interviewId) });
      void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.report(variables.interviewId) });
    }
  });
}
