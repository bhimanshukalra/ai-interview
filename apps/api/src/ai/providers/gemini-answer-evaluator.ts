import { AnswerEvaluationSchema } from '@ai-interview/shared';
import type { AnswerEvaluator } from '../answer-evaluator';
import { generateGeminiJson } from './gemini-client';

type GeminiAnswerEvaluatorOptions = {
  apiKey: string;
  model: string;
};

function buildResponseSchema() {
  return {
    type: 'object',
    properties: {
      score: { type: 'number' },
      summary: { type: 'string' },
      strengths: {
        type: 'array',
        items: { type: 'string' }
      },
      weaknesses: {
        type: 'array',
        items: { type: 'string' }
      },
      followUpQuestion: { type: 'string' }
    },
    required: ['score', 'summary', 'strengths', 'weaknesses']
  };
}

export function createGeminiAnswerEvaluator(options: GeminiAnswerEvaluatorOptions): AnswerEvaluator {
  return {
    async evaluateAnswer(input) {
      const question = input.interview.questions.find((item) => item.id === input.answer.questionId);

      const prompt = [
        `Role: ${input.interview.input.role}`,
        `Level: ${input.interview.input.level}`,
        `Interview type: ${input.interview.input.type}`,
        `Topic: ${input.interview.input.topic ?? 'general role fundamentals'}`,
        `Question: ${question?.question ?? 'Unknown question'}`,
        `Candidate answer: ${input.answer.answer}`,
        '',
        'Evaluate the candidate answer using the rubric and return structured feedback.',
        `Excellent rubric: ${question?.rubric.excellent ?? 'Clear, accurate, specific answer.'}`,
        `Good rubric: ${question?.rubric.good ?? 'Mostly accurate with some detail.'}`,
        `Weak rubric: ${question?.rubric.weak ?? 'Incomplete or vague answer.'}`
      ].join('\n');

      const payload = await generateGeminiJson({
        apiKey: options.apiKey,
        model: options.model,
        prompt,
        responseJsonSchema: buildResponseSchema(),
        systemInstruction:
          'You are an expert interviewer evaluating a written candidate answer. Be fair, specific, and concise.'
      });

      return AnswerEvaluationSchema.parse(payload);
    }
  };
}
