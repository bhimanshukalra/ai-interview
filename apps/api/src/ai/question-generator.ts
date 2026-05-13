import type { CreateInterviewInput, InterviewQuestion } from '@ai-interview/shared';

export type QuestionGenerationProvider = 'mock' | 'gemini';

export type QuestionGenerationConfig = {
  provider?: QuestionGenerationProvider;
  apiKey?: string;
  model?: string;
};

export type QuestionGenerator = {
  generateQuestions(input: CreateInterviewInput): Promise<InterviewQuestion[]>;
};
