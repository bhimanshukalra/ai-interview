'use client';

import Link from 'next/link';
import { useInterviewReport } from '@/features/interviews/use-interview-report';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';

type InterviewReportPageProps = {
  id: string;
};

export function InterviewReportPage({ id }: InterviewReportPageProps) {
  const { data: report, error, isError, isLoading } = useInterviewReport(id);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
        <p className="text-stone-600">Loading report...</p>
      </main>
    );
  }

  if (isError || !report) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
        <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Report unavailable</p>
          <h1 className="text-3xl font-bold text-stone-950">Could not load report</h1>
          <p className="mt-3 leading-7 text-stone-600">
            {getFriendlyApiErrorMessage(error, 'Complete the interview and generate a report to see feedback.')}
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800"
            href={`/interviews/${id}`}
          >
            Back to interview
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-950">
      <section className="mx-auto w-full max-w-4xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Mock evaluation report</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-stone-950">Interview report</h1>
            <p className="mt-3 text-stone-600">
              {report.answeredQuestions} of {report.totalQuestions} questions evaluated.
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-stone-500">Overall score</p>
            <p className="mt-1 text-4xl font-bold text-teal-700">{report.overallScore}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {report.evaluations.map((evaluation, index) => (
            <article key={evaluation.id} className="rounded-lg border border-stone-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-semibold text-stone-950">Answer {index + 1}</h2>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700">
                  {evaluation.score}/10
                </span>
              </div>
              <p className="mt-3 leading-7 text-stone-700">{evaluation.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-600">Strengths</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                    {evaluation.strengths.map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-600">Improvements</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                    {evaluation.weaknesses.map((weakness) => (
                      <li key={weakness}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {evaluation.followUpQuestion ? (
                <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                  Follow-up: {evaluation.followUpQuestion}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
