'use client';

import { useQuery } from '@tanstack/react-query';
import { getInterviewAnswers } from './api';
import { interviewQueryKeys } from './query-keys';

export function useInterviewAnswers(interviewId: string) {
  return useQuery({
    queryKey: interviewQueryKeys.answers(interviewId),
    queryFn: () => getInterviewAnswers(interviewId),
    retry: false
  });
}
