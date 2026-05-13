'use client';

import Link from 'next/link';
import type { CreateInterviewResponse, InterviewAnswer } from '@ai-interview/shared';
import { InterviewSession } from '@/components/interview-session';
import { LoadingPanel } from '@/components/loading-panel';
import { useInterviewAnswers } from '@/features/interviews/use-interview-answers';
import { useInterviewSession } from '@/features/interviews/use-interview-session';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';

type InterviewSessionPageProps = {
  id: string;
};

export function InterviewSessionPage({ id }: InterviewSessionPageProps) {
  const { data: interview, error: interviewError, isError, isLoading } = useInterviewSession(id);
  const {
    data: answersResponse,
    error: answersError,
    isError: areAnswersError,
    isLoading: areAnswersLoading
  } = useInterviewAnswers(id);

  if (isLoading || areAnswersLoading) {
    return <SessionLoadingState />;
  }

  if (isError || areAnswersError || !interview) {
    return <SessionErrorState error={interviewError ?? answersError} />;
  }

  return <SessionLoadedState interview={interview} savedAnswers={answersResponse?.answers ?? []} />;
}

function SessionLoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <LoadingPanel eyebrow="Interview session" title="Loading interview" />
    </main>
  );
}

function SessionErrorState({ error }: { error: unknown }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Session unavailable</p>
        <h1 className="text-3xl font-bold text-stone-950">Could not load interview</h1>
        <p className="mt-3 leading-7 text-stone-600">
          {getFriendlyApiErrorMessage(
            error,
            'The interview may not exist yet, or the API may be unavailable.'
          )}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800"
          href="/"
        >
          Create interview
        </Link>
      </section>
    </main>
  );
}

function SessionLoadedState({
  interview,
  savedAnswers
}: {
  interview: CreateInterviewResponse;
  savedAnswers: InterviewAnswer[];
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <InterviewSession interview={interview} savedAnswers={savedAnswers} />
    </main>
  );
}
