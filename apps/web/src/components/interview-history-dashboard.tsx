'use client';

import Link from 'next/link';
import type { InterviewSummary, InterviewSummaryStatus } from '@ai-interview/shared';
import { useInterviewHistory } from '@/features/interviews/use-interview-history';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';

const statusLabels: Record<InterviewSummaryStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'ready-for-report': 'Ready for report',
  'report-ready': 'Report ready'
};

const statusClasses: Record<InterviewSummaryStatus, string> = {
  'not-started': 'border-stone-200 bg-stone-50 text-stone-700',
  'in-progress': 'border-amber-200 bg-amber-50 text-amber-800',
  'ready-for-report': 'border-teal-200 bg-teal-50 text-teal-800',
  'report-ready': 'border-emerald-200 bg-emerald-50 text-emerald-800'
};

export function InterviewHistoryDashboard(): React.ReactElement {
  const { data, error, isError, isLoading } = useInterviewHistory();

  if (isLoading) {
    return <InterviewHistoryLoadingState />;
  }

  if (isError) {
    return <InterviewHistoryErrorState error={error} />;
  }

  const interviews = data?.interviews ?? [];

  if (interviews.length === 0) {
    return <InterviewHistoryEmptyState />;
  }

  return <InterviewHistoryLoadedState interviews={interviews} />;
}

function InterviewHistoryLoadingState(): React.ReactElement {
  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">History</p>
      <div className="grid gap-3">
        <div className="h-6 w-44 animate-pulse rounded bg-stone-200" />
        <div className="h-20 animate-pulse rounded-lg bg-stone-100" />
        <div className="h-20 animate-pulse rounded-lg bg-stone-100" />
      </div>
    </section>
  );
}

function InterviewHistoryErrorState({ error }: { error: unknown }): React.ReactElement {
  return (
    <section className="w-full rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8" role="alert">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">History unavailable</p>
      <h2 className="text-2xl font-bold text-red-950">Could not load interviews</h2>
      <p className="mt-2 text-sm leading-6 text-red-800">
        {getFriendlyApiErrorMessage(error, 'Try again before resuming an interview.')}
      </p>
    </section>
  );
}

function InterviewHistoryEmptyState(): React.ReactElement {
  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">History</p>
      <h2 className="text-2xl font-bold text-stone-950">No interviews yet</h2>
      <p className="mt-2 leading-7 text-stone-600">
        Create your first interview below. It will appear here once the session is ready.
      </p>
    </section>
  );
}

function InterviewHistoryLoadedState({ interviews }: { interviews: InterviewSummary[] }): React.ReactElement {
  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">History</p>
          <h2 className="text-2xl font-bold text-stone-950">Your interviews</h2>
        </div>
        <p className="text-sm font-medium text-stone-500">
          {interviews.length} {interviews.length === 1 ? 'session' : 'sessions'}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {interviews.map((interview) => (
          <InterviewHistoryItem key={interview.id} interview={interview} />
        ))}
      </div>
    </section>
  );
}

function InterviewHistoryItem({ interview }: { interview: InterviewSummary }): React.ReactElement {
  const answeredLabel = `${interview.answeredCount}/${interview.questionCount} answered`;
  const detailParts = [
    interview.level,
    interview.type,
    interview.topic,
    formatDate(interview.createdAt)
  ].filter(Boolean);

  return (
    <article className="rounded-lg border border-stone-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-stone-950">{interview.role}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{detailParts.join(' · ')}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[interview.status]}`}>
          {statusLabels[interview.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-stone-700">
          <span className="rounded-full border border-stone-200 px-3 py-1">{answeredLabel}</span>
          {interview.overallScore === null ? null : (
            <span className="rounded-full border border-stone-200 px-3 py-1">
              Score {interview.overallScore}/10
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            href={`/interviews/${interview.id}`}
          >
            {interview.status === 'not-started' ? 'Start' : 'Resume'}
          </Link>
          {interview.status === 'report-ready' ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800"
              href={`/interviews/${interview.id}/report`}
            >
              View report
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}
