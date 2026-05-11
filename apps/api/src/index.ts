import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateInterviewSchema, type CreateInterviewInput, type InterviewQuestion } from '@ai-interview/shared';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'ai-interview-api' }));

function createMockQuestions(input: CreateInterviewInput): InterviewQuestion[] {
  const topic = input.topic ?? input.role;

  return Array.from({ length: input.questionCount }, (_, index) => {
    const questionNumber = index + 1;

    return {
      id: crypto.randomUUID(),
      title: `${topic} question ${questionNumber}`,
      question: `Mock question ${questionNumber}: For a ${input.level} ${input.role}, explain an important ${topic} concept and include one practical example.`,
      difficulty: input.level,
      type: input.type,
      rubric: {
        excellent: 'Clear, accurate answer with a practical example and relevant tradeoffs.',
        good: 'Mostly accurate answer with some detail and at least one concrete example.',
        weak: 'Vague, incomplete, or missing a practical example.'
      }
    };
  });
}

app.post('/interviews', async (c) => {
  const body = await c.req.json();
  const input = CreateInterviewSchema.parse(body);

  return c.json({
    id: crypto.randomUUID(),
    status: 'created',
    input,
    questions: createMockQuestions(input)
  }, 201);
});

export default app;
