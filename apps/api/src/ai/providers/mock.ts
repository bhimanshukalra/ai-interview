import type { CreateInterviewInput, InterviewQuestion } from '@ai-interview/shared';
import type { QuestionGenerator } from '../question-generator';

export function createMockQuestionGenerator(): QuestionGenerator {
  return {
    async generateQuestions(input) {
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
        } satisfies InterviewQuestion;
      });
    }
  };
}
