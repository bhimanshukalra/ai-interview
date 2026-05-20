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
      score: { type: 'integer', minimum: 0, maximum: 10 },
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

function buildCandidateCodeSection(input: Parameters<AnswerEvaluator['evaluateAnswer']>[0]): string[] {
  if (!input.answer.code?.trim()) {
    return [
      'Candidate code:',
      'No code was provided for this answer.'
    ];
  }

  return [
    'Candidate code:',
    `- Language: ${input.answer.codeLanguage ?? 'unknown'}`,
    '- Code:',
    input.answer.code
  ];
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
        ...buildCandidateCodeSection(input),
        '',
        'Evaluation requirements:',
        '- Score must be an integer from 0 to 10 using the scoring guide below.',
        '- Judge only the submitted answer and code, not the candidate in general.',
        '- If candidate code is provided, evaluate it as supporting evidence for the written answer.',
        '- Consider code correctness, edge cases, readability, complexity, and fit to the question.',
        '- Consider whether the written explanation and code agree with each other.',
        '- Do not require code for behavioral questions or questions that do not ask for implementation.',
        '- Do not penalize missing code unless the question clearly expects code.',
        '- Reward concrete examples, accurate reasoning, tradeoff awareness, and role-appropriate depth.',
        '- Penalize vague claims, missing specifics, incorrect concepts, and unsupported assertions.',
        '- Keep the summary concise and actionable.',
        '- Strengths should cite what the answer did well.',
        '- Weaknesses should name the most important improvements.',
        '- Include one follow-up question when it would reveal useful depth.',
        '',
        'Scoring guide:',
        '- 10: exceptional answer with accurate depth, concrete evidence, tradeoffs, and clear senior-level judgment.',
        '- 8-9: strong answer with accurate substance and useful specifics, with only minor gaps.',
        '- 6-7: acceptable answer that covers the main idea but lacks depth, evidence, or important tradeoffs.',
        '- 4-5: partial answer with some relevant points but notable omissions, vagueness, or confusion.',
        '- 1-3: mostly incorrect, extremely shallow, or not meaningfully connected to the question.',
        '- 0: blank, evasive, or entirely unrelated answer.'
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
