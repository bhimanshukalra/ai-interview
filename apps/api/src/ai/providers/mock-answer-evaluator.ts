import type { AnswerEvaluation } from '@ai-interview/shared';
import type { AnswerEvaluator } from '../answer-evaluator';

function createMockEvaluation(answer: string): AnswerEvaluation {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.max(1, Math.min(8, Math.round(wordCount / 16) + 2));

  return {
    score,
    summary:
      score >= 8
        ? "Strong answer with enough detail to evaluate the candidate's thinking."
        : score >= 6
          ? 'Reasonable answer, but it would benefit from more specific examples and tradeoffs.'
          : 'The answer is too brief to show clear understanding.',
    strengths:
      score >= 7
        ? ['Communicates the core idea', 'Includes enough detail to discuss further']
        : ['Provides a starting point for discussion'],
    weaknesses:
      score >= 8
        ? ['Could still mention edge cases or tradeoffs']
        : ['Needs more concrete examples', 'Needs clearer reasoning'],
    followUpQuestion: 'Can you give a concrete example from a real project or implementation?'
  };
}

export function createMockAnswerEvaluator(): AnswerEvaluator {
  return {
    async evaluateAnswer(input) {
      return createMockEvaluation(input.answer.answer);
    }
  };
}
