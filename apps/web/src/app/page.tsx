import { CreateInterviewSchema } from '@ai-interview/shared';

const defaults = CreateInterviewSchema.parse({
  role: 'Frontend Engineer',
  level: 'junior',
  type: 'technical',
  topic: 'React',
  questionCount: 5
});

export default function Home() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">MVP</p>
        <h1>AI Interview</h1>
        <p className="lede">A text-based interview flow for generating questions, collecting answers, and producing a feedback report.</p>
        <div className="preview">
          <span>{defaults.role}</span>
          <span>{defaults.level}</span>
          <span>{defaults.type}</span>
          <span>{defaults.topic}</span>
          <span>{defaults.questionCount} questions</span>
        </div>
      </section>
    </main>
  );
}
