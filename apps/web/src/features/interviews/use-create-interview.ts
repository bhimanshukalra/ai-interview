"use client";

import { type UseMutateAsyncFunction, useMutation } from "@tanstack/react-query";
import type {
  CreateInterviewInput,
  CreateInterviewResponse,
} from "@ai-interview/shared";
import { getFriendlyApiErrorMessage } from "@/lib/api/errors";
import { createInterview } from "./api";
import { interviewQueryKeys } from "./query-keys";

type UseCreateInterviewResult = {
  create: UseMutateAsyncFunction<CreateInterviewResponse, Error, CreateInterviewInput>;
  error: string | null;
  interview: CreateInterviewResponse | null;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  reset: () => void;
};

export function useCreateInterview(): UseCreateInterviewResult {
  const mutation = useMutation<
    CreateInterviewResponse,
    Error,
    CreateInterviewInput
  >({
    mutationKey: interviewQueryKeys.create,
    mutationFn: createInterview,
  });

  return {
    create: mutation.mutateAsync,
    error: getSubmitErrorMessage(mutation.error),
    interview: mutation.data ?? null,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

function getSubmitErrorMessage(error: Error | null): string | null {
  if (!error) {
    return null;
  }

  return getFriendlyApiErrorMessage(error, "Could not create the interview.");
}
