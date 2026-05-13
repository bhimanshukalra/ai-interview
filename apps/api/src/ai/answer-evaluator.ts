import type { AnswerEvaluation, CreateInterviewResponse, InterviewAnswer } from '@ai-interview/shared';

export type AnswerEvaluationProvider = 'mock' | 'gemini';

export type AnswerEvaluationConfig = {
  provider?: AnswerEvaluationProvider;
  apiKey?: string;
  model?: string;
  fallbackToMock?: boolean;
};

export type AnswerEvaluationInput = {
  answer: InterviewAnswer;
  interview: CreateInterviewResponse;
};

export type AnswerEvaluator = {
  evaluateAnswer(input: AnswerEvaluationInput): Promise<AnswerEvaluation>;
};
