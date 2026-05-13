import { AuthPanel } from '@/components/auth-panel';
import { InterviewSetupForm } from '@/components/interview-setup-form';

export default function Home(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <AuthPanel>
        <InterviewSetupForm />
      </AuthPanel>
    </main>
  );
}
