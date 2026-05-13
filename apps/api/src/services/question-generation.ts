import type { CreateInterviewInput, InterviewQuestion } from '@ai-interview/shared';
import type { QuestionGenerationConfig, QuestionGenerator } from '../ai/question-generator';
import { createGeminiQuestionGenerator } from '../ai/providers/gemini';
import { createMockQuestionGenerator } from '../ai/providers/mock';
import { logWarning } from '../logger';

function createConfiguredQuestionGenerator(config: QuestionGenerationConfig): QuestionGenerator {
  if (config.provider === 'gemini' && config.apiKey) {
    return createGeminiQuestionGenerator({
      apiKey: config.apiKey,
      model: config.model ?? 'gemini-2.5-flash'
    });
  }

  return createMockQuestionGenerator();
}

export async function generateInterviewQuestions(
  input: CreateInterviewInput,
  config: QuestionGenerationConfig
): Promise<InterviewQuestion[]> {
  const fallbackGenerator = createMockQuestionGenerator();
  const configuredGenerator = createConfiguredQuestionGenerator(config);

  try {
    const questions = await configuredGenerator.generateQuestions(input);

    if (questions.length === input.questionCount) {
      return questions;
    }

    throw new Error(`Question generator returned ${questions.length} questions, expected ${input.questionCount}.`);
  } catch (error) {
    if (!config.fallbackToMock) {
      throw error;
    }

    logWarning('Question generation failed; using mock fallback.', error);
  }

  return fallbackGenerator.generateQuestions(input);
}
