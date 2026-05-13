import { z } from 'zod';
import type { CreateInterviewInput, InterviewQuestion } from '@ai-interview/shared';
import type { QuestionGenerator } from '../question-generator';
import { generateGeminiJson } from './gemini-client';

type GeminiQuestionGeneratorOptions = {
  apiKey: string;
  model: string;
};

const GeneratedQuestionSchema = z.object({
  title: z.string(),
  question: z.string(),
  rubric: z.object({
    excellent: z.string(),
    good: z.string(),
    weak: z.string()
  })
});

const GeneratedQuestionsSchema = z.object({
  questions: z.array(GeneratedQuestionSchema)
});

function buildPrompt(input: CreateInterviewInput) {
  const focus = input.topic?.trim() || 'general role fundamentals';

  return [
    `Create exactly ${input.questionCount} interview questions for a text-based mock interview.`,
    '',
    'Candidate profile:',
    `- Role: ${input.role}`,
    `- Level: ${input.level}`,
    `- Interview type: ${input.type}`,
    `- Focus area: ${focus}`,
    '',
    'Question requirements:',
    '- Match the expected scope and vocabulary for the candidate level.',
    '- Ask practical, open-ended questions that can be answered in writing.',
    '- Prefer prompts that reveal reasoning, tradeoffs, debugging approach, collaboration, and real project judgment.',
    '- For technical questions, include enough scenario context that the candidate can make concrete choices.',
    '- For behavioral questions, ask for specific examples, actions, outcomes, and reflection.',
    '- Avoid trivia, yes/no questions, brainteasers, and duplicate coverage.',
    '- Keep each question concise: one main question with at most one clarifying sentence.',
    '',
    'Rubric requirements:',
    '- The excellent criterion should describe a strong, specific, evidence-backed answer.',
    '- The good criterion should describe a mostly correct answer with minor gaps.',
    '- The weak criterion should describe vague, incorrect, or shallow answers.',
    '- Rubrics must be tailored to the exact question, not generic.'
  ].join('\n');
}

function buildResponseSchema() {
  return {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            question: { type: 'string' },
            rubric: {
              type: 'object',
              properties: {
                excellent: { type: 'string' },
                good: { type: 'string' },
                weak: { type: 'string' }
              },
              required: ['excellent', 'good', 'weak']
            }
          },
          required: ['title', 'question', 'rubric']
        }
      }
    },
    required: ['questions']
  };
}

async function generateQuestions(
  input: CreateInterviewInput,
  options: GeminiQuestionGeneratorOptions
): Promise<InterviewQuestion[]> {
  const generated = GeneratedQuestionsSchema.parse(
    await generateGeminiJson({
      apiKey: options.apiKey,
      model: options.model,
      prompt: buildPrompt(input),
      responseJsonSchema: buildResponseSchema(),
      systemInstruction:
        'You are a senior interviewer designing fair, job-relevant interview questions. Return only structured JSON that matches the provided schema.'
    })
  );

  return generated.questions.slice(0, input.questionCount).map((question) => ({
    id: crypto.randomUUID(),
    title: question.title,
    question: question.question,
    difficulty: input.level,
    type: input.type,
    rubric: question.rubric
  } satisfies InterviewQuestion));
}

export function createGeminiQuestionGenerator(options: GeminiQuestionGeneratorOptions): QuestionGenerator {
  return {
    generateQuestions: (input) => generateQuestions(input, options)
  };
}
