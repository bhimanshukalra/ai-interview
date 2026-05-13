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
  return [
    `Create ${input.questionCount} interview questions.`,
    `Role: ${input.role}`,
    `Level: ${input.level}`,
    `Interview type: ${input.type}`,
    `Topic: ${input.topic ?? 'general role fundamentals'}`,
    'Questions should be realistic, concise, and useful for a text-based mock interview.',
    'Avoid trivia. Prefer questions that reveal reasoning, examples, tradeoffs, and practical experience.'
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
        'You are an expert technical interviewer. Return only structured JSON that matches the provided schema.'
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
