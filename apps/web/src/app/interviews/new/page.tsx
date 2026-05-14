import Link from 'next/link';
import { AuthPanel } from '@/components/auth-panel';
import { InterviewSetupForm } from '@/components/interview-setup-form';

export default function NewInterviewPage(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <AuthPanel>
        <div className="grid gap-4">
          <Link
            className="inline-flex min-h-10 w-fit items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
            href="/"
          >
            Back to interviews
          </Link>
          <InterviewSetupForm />
        </div>
      </AuthPanel>
    </main>
  );
}
