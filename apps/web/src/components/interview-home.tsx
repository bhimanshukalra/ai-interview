import Link from 'next/link';
import { InterviewHistoryDashboard } from '@/components/interview-history-dashboard';

export function InterviewHome(): React.ReactElement {
  return (
    <div className="grid gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-950">Practice interviews</h1>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800"
          href="/interviews/new"
        >
          Create new interview
        </Link>
      </section>

      <InterviewHistoryDashboard />
    </div>
  );
}
