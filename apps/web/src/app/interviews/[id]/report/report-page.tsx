'use client';

import Link from 'next/link';
import type { CodeEditorLanguage, InterviewReportResponse } from '@ai-interview/shared';
import { LoadingPanel } from '@/components/loading-panel';
import { ScreenStatePanel } from '@/components/screen-state-panel';
import { useInterviewReport } from '@/features/interviews/use-interview-report';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';

type InterviewReportPageProps = {
  id: string;
};

const codeLanguageLabels: Record<CodeEditorLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  sql: 'SQL'
};

export function InterviewReportPage({ id }: InterviewReportPageProps): React.ReactElement {
  const { data: report, error, isError, isLoading } = useInterviewReport(id);

  if (isLoading) {
    return <ReportLoadingState />;
  }

  if (isError || !report) {
    return <ReportErrorState id={id} error={error} />;
  }

  if (report.evaluations.length === 0) {
    return <ReportEmptyState id={id} />;
  }

  return <ReportLoadedState id={id} report={report} />;
}

function ReportLoadingState(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <LoadingPanel eyebrow="Report" title="Loading feedback" />
    </main>
  );
}

function ReportErrorState({ id, error }: { id: string; error: unknown }): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <ScreenStatePanel
        actions={<PrimaryLink href={`/interviews/${id}`}>Back to interview</PrimaryLink>}
        eyebrow="Report unavailable"
        message={getFriendlyApiErrorMessage(error, 'Complete the interview and generate a report to see feedback.')}
        role="alert"
        title="Could not load report"
        tone="danger"
      />
    </main>
  );
}

function ReportEmptyState({ id }: { id: string }): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <ScreenStatePanel
        actions={<PrimaryLink href={`/interviews/${id}`}>Back to interview</PrimaryLink>}
        eyebrow="Report"
        message="No evaluations are available yet. Finish the interview and generate the report to see feedback."
        title="No feedback yet"
      />
    </main>
  );
}

function ReportLoadedState({ id, report }: { id: string; report: InterviewReportResponse }): React.ReactElement {
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
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
              href={`/interviews/${id}`}
            >
              Back to interview
            </Link>
            <div className="rounded-lg border border-stone-200 px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase text-stone-500">Overall score</p>
              <p className="mt-1 text-4xl font-bold text-teal-700">{report.overallScore}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {report.evaluations.map((evaluation, index) => (
            <article key={evaluation.id} className="rounded-lg border border-stone-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-500">Question {index + 1}</p>
                  <h2 className="mt-1 font-semibold text-stone-950">{evaluation.questionTitle}</h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700">
                  {evaluation.score}/10
                </span>
              </div>
              <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                {evaluation.question}
              </p>
              <details className="mt-3 rounded-lg border border-stone-200 p-3 text-sm text-stone-700">
                <summary className="cursor-pointer font-semibold text-stone-800">Your answer</summary>
                <p className="mt-2 whitespace-pre-wrap leading-6">{evaluation.answer}</p>
              </details>
              {evaluation.code ? (
                <details className="mt-3 rounded-lg border border-stone-200 p-3 text-sm text-stone-700">
                  <summary className="cursor-pointer font-semibold text-stone-800">Your code</summary>
                  <div className="mt-3 overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
                    <div className="border-b border-stone-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                      {evaluation.codeLanguage ? codeLanguageLabels[evaluation.codeLanguage] : 'Code'}
                    </div>
                    <pre className="overflow-x-auto p-3 text-sm leading-6 text-stone-100">
                      <code>{evaluation.code}</code>
                    </pre>
                  </div>
                </details>
              ) : null}
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
