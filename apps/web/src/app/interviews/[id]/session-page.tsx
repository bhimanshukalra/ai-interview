'use client';

import Link from 'next/link';
import type { CreateInterviewResponse, InterviewAnswer } from '@ai-interview/shared';
import { InterviewSession } from '@/components/interview-session';
import { LoadingPanel } from '@/components/loading-panel';
import { ScreenStatePanel } from '@/components/screen-state-panel';
import { useInterviewAnswers } from '@/features/interviews/use-interview-answers';
import { useInterviewSession } from '@/features/interviews/use-interview-session';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';

type InterviewSessionPageProps = {
  id: string;
};

export function InterviewSessionPage({ id }: InterviewSessionPageProps): React.ReactElement {
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

  if (interview.questions.length === 0) {
    return <SessionEmptyState />;
  }

  return <SessionLoadedState interview={interview} savedAnswers={answersResponse?.answers ?? []} />;
}

function SessionLoadingState(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <LoadingPanel eyebrow="Interview session" title="Loading interview" />
    </main>
  );
}

function SessionErrorState({ error }: { error: unknown }): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <ScreenStatePanel
        actions={<PrimaryLink href="/">Back to interviews</PrimaryLink>}
        eyebrow="Session unavailable"
        message={getFriendlyApiErrorMessage(
          error,
          'The interview may not exist yet, or the API may be unavailable.',
        )}
        role="alert"
        title="Could not load interview"
        tone="danger"
      />
    </main>
  );
}

function SessionEmptyState(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <ScreenStatePanel
        actions={<PrimaryLink href="/">Back to interviews</PrimaryLink>}
        eyebrow="Interview session"
        message="This interview does not have any questions yet. Create a new interview to start a practice session."
        title="No questions available"
      />
    </main>
  );
}

function SessionLoadedState({
  interview,
  savedAnswers
}: {
  interview: CreateInterviewResponse;
  savedAnswers: InterviewAnswer[];
}): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <InterviewSession interview={interview} savedAnswers={savedAnswers} />
    </main>
  );
}

function PrimaryLink({ children, href }: { children: React.ReactNode; href: string }): React.ReactElement {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800"
      href={href}
    >
      {children}
    </Link>
  );
}
