import { AuthPanel } from '@/components/auth-panel';
import { InterviewHome } from '@/components/interview-home';

export default function Home(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-5 py-10 text-stone-950">
      <AuthPanel>
        <InterviewHome />
      </AuthPanel>
    </main>
  );
}
