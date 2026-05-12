'use client';

import Link from 'next/link';
import { InterviewSession } from '@/components/interview-session';
import { useInterviewSession } from '@/features/interviews/use-interview-session';

type InterviewSessionPageProps = {
  id: string;
};

export function InterviewSessionPage({ id }: InterviewSessionPageProps) {
  const { data: interview, isError, isLoading } = useInterviewSession(id);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
        <p className="text-stone-600">Loading interview...</p>
      </main>
    );
  }

  if (isError || !interview) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
        <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Session unavailable</p>
          <h1 className="text-3xl font-bold text-stone-950">Interview not found</h1>
          <p className="mt-3 leading-7 text-stone-600">
            This MVP stores mock sessions in the local Hono API process. Create a new interview to continue.
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

  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <InterviewSession interview={interview} />
    </main>
  );
}
