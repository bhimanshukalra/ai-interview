"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateInterviewInput,
  CreateInterviewResponse,
} from "@ai-interview/shared";
import { ApiError } from "@/lib/api/errors";
import { createInterview } from "./api";
import { interviewQueryKeys } from "./query-keys";

type CreateInterviewMutationError = ApiError | Error;

export function useCreateInterview() {
  const mutation = useMutation<
    CreateInterviewResponse,
    CreateInterviewMutationError,
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

function getSubmitErrorMessage(error: CreateInterviewMutationError | null) {
  if (!error) {
    return null;
  }

  const baseMessage = error.message || "Could not create the interview.";
  return `${baseMessage} Make sure the Hono API is running with pnpm dev:api.`;
}
