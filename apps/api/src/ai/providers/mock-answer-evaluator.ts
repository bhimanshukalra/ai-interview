import type { AnswerEvaluation, InterviewAnswer } from '@ai-interview/shared';
import type { AnswerEvaluator } from '../answer-evaluator';

function createMockSignal(score: number, note: string): { score: number; note: string } {
  return { score, note };
}

function createMockEvaluation(answer: InterviewAnswer): AnswerEvaluation {
  const wordCount = answer.answer.trim().split(/\s+/).filter(Boolean).length;
  const hasCode = Boolean(answer.code?.trim());
  const score = Math.max(1, Math.min(8, Math.round(wordCount / 16) + 2));

  return {
    score,
    summary:
      score >= 8
        ? "Strong answer with enough detail to evaluate the candidate's thinking."
        : score >= 6
          ? 'Reasonable answer, but it would benefit from more specific examples and tradeoffs.'
          : 'The answer is too brief to show clear understanding.',
    signalBreakdown: {
      correctness: createMockSignal(score, 'Mock evaluator estimates correctness from answer detail.'),
      clarity: createMockSignal(score, 'Mock evaluator estimates clarity from answer length and specificity.'),
      codeQuality: createMockSignal(
        hasCode ? Math.max(score, 6) : 0,
        hasCode ? 'Code is present for review context.' : 'No code was submitted for this answer.'
      ),
      tradeoffs: createMockSignal(Math.max(0, score - 1), 'Tradeoff depth is inferred from explanation detail.'),
      edgeCases: createMockSignal(Math.max(0, score - 2), 'Edge-case coverage is inferred from explanation detail.'),
      debugging: createMockSignal(Math.max(0, score - 2), 'Debugging depth is inferred from explanation detail.'),
      systemsThinking: createMockSignal(Math.max(0, score - 1), 'Systems thinking is inferred from explanation detail.'),
    },
    strengths:
      score >= 7
        ? [
          'Communicates the core idea',
          hasCode ? 'Includes a code example for implementation context' : 'Includes enough detail to discuss further'
        ]
        : [
          'Provides a starting point for discussion',
          ...(hasCode ? ['Includes code that can be reviewed alongside the explanation'] : [])
        ],
    weaknesses:
      score >= 8
        ? [hasCode ? 'Could still discuss code edge cases or tradeoffs' : 'Could still mention edge cases or tradeoffs']
        : [
          'Needs more concrete examples',
          hasCode ? 'Needs clearer explanation of how the code handles edge cases' : 'Needs clearer reasoning'
        ],
    followUpQuestion: 'Can you give a concrete example from a real project or implementation?'
  };
}

export function createMockAnswerEvaluator(): AnswerEvaluator {
  return {
    async evaluateAnswer(input) {
      return createMockEvaluation(input.answer);
    }
  };
}
