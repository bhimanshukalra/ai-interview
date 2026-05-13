import type { AnswerEvaluation, CreateInterviewResponse, InterviewAnswer } from '@ai-interview/shared';
import type { AnswerEvaluationConfig, AnswerEvaluator } from '../ai/answer-evaluator';
import { createGeminiAnswerEvaluator } from '../ai/providers/gemini-answer-evaluator';
import { createMockAnswerEvaluator } from '../ai/providers/mock-answer-evaluator';

function createConfiguredAnswerEvaluator(config: AnswerEvaluationConfig): AnswerEvaluator {
  if (config.provider === 'gemini' && config.apiKey) {
    return createGeminiAnswerEvaluator({
      apiKey: config.apiKey,
      model: config.model ?? 'gemini-2.5-flash'
    });
  }

  return createMockAnswerEvaluator();
}

export async function evaluateInterviewAnswer(
  answer: InterviewAnswer,
  interview: CreateInterviewResponse,
  config: AnswerEvaluationConfig
): Promise<AnswerEvaluation> {
  const fallbackEvaluator = createMockAnswerEvaluator();
  const configuredEvaluator = createConfiguredAnswerEvaluator(config);

  try {
    return await configuredEvaluator.evaluateAnswer({ answer, interview });
  } catch (error) {
    console.warn(error);
    return fallbackEvaluator.evaluateAnswer({ answer, interview });
  }
}
