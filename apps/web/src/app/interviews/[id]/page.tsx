import { InterviewSessionPage } from './session-page';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <InterviewSessionPage id={id} />;
}
