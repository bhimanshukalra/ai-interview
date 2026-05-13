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
        'Evaluate this written mock interview answer.',
        '',
        'Interview context:',
        `- Role: ${input.interview.input.role}`,
        `- Level: ${input.interview.input.level}`,
        `- Interview type: ${input.interview.input.type}`,
        `- Topic: ${input.interview.input.topic ?? 'general role fundamentals'}`,
        '',
        'Question context:',
        `- Title: ${question?.title ?? 'Unknown question'}`,
        `- Prompt: ${question?.question ?? 'Unknown question'}`,
        '',
        'Question rubric:',
        `- Excellent: ${question?.rubric.excellent ?? 'Clear, accurate, specific answer.'}`,
        `- Good: ${question?.rubric.good ?? 'Mostly accurate with some detail.'}`,
        `- Weak: ${question?.rubric.weak ?? 'Incomplete or vague answer.'}`,
        '',
        'Candidate answer:',
        input.answer.answer,
        '',
        'Evaluation requirements:',
        '- Judge only the written answer, not the candidate in general.',
        '- Reward concrete examples, accurate reasoning, tradeoff awareness, and role-appropriate depth.',
        '- Penalize vague claims, missing specifics, incorrect concepts, and unsupported assertions.',
        '- Keep the summary concise and actionable.',
        '- Strengths should cite what the answer did well.',
        '- Weaknesses should name the most important improvements.',
        '- Include one follow-up question when it would reveal useful depth.'
      ].join('\n');

      const payload = await generateGeminiJson({
        apiKey: options.apiKey,
        model: options.model,
        prompt,
        responseJsonSchema: buildResponseSchema(),
        systemInstruction:
          'You are a fair senior interviewer evaluating a written candidate answer against a rubric. Return only structured JSON that matches the schema.'
      });

      return AnswerEvaluationSchema.parse(payload);
    }
  };
}
