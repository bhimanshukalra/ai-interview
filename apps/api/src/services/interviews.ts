import type {
  CreateInterviewInput,
  CreateInterviewResponse,
  InterviewQuestion
} from '@ai-interview/shared';

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

export function createInterview(input: CreateInterviewInput): CreateInterviewResponse {
  return {
    id: crypto.randomUUID(),
    status: 'created',
    input,
    questions: createMockQuestions(input)
  };
}
