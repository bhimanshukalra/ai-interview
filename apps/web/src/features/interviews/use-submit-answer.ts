'use client';

import { type QueryClient, type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InterviewAnswer, SubmitAnswerInput } from '@ai-interview/shared';
import { submitInterviewAnswer } from './api';
import { interviewQueryKeys } from './query-keys';

type SubmitAnswerVariables = {
  interviewId: string;
  input: SubmitAnswerInput;
};

function submitInterviewAnswerMutation({ interviewId, input }: SubmitAnswerVariables): Promise<InterviewAnswer> {
  return submitInterviewAnswer(interviewId, input);
}

function handleSubmitAnswerSuccess(queryClient: QueryClient, variables: SubmitAnswerVariables): void {
  void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.list });
  void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.answers(variables.interviewId) });
  void queryClient.invalidateQueries({ queryKey: interviewQueryKeys.report(variables.interviewId) });
}

export function useSubmitAnswer(): UseMutationResult<InterviewAnswer, Error, SubmitAnswerVariables> {
  const queryClient = useQueryClient();

  function handleMutationSuccess(_answer: InterviewAnswer, variables: SubmitAnswerVariables): void {
    handleSubmitAnswerSuccess(queryClient, variables);
  }

  return useMutation<InterviewAnswer, Error, SubmitAnswerVariables>({
    mutationKey: interviewQueryKeys.submitAnswer,
    mutationFn: submitInterviewAnswerMutation,
    onSuccess: handleMutationSuccess
  });
}
