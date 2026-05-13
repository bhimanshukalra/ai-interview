import { InterviewReportPage } from './report-page';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <InterviewReportPage id={id} />;
}
