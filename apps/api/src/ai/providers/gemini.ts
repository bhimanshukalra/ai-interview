import { z } from 'zod';
import type { CreateInterviewInput, InterviewQuestion } from '@ai-interview/shared';
import type { QuestionGenerator } from '../question-generator';

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

const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string()
          })
        )
      })
    })
  )
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

export function createGeminiQuestionGenerator(options: GeminiQuestionGeneratorOptions): QuestionGenerator {
  return {
    async generateQuestions(input) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': options.apiKey
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: 'You are an expert technical interviewer. Return only structured JSON that matches the provided schema.'
                }
              ]
            },
            contents: [
              {
                parts: [{ text: buildPrompt(input) }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseJsonSchema: buildResponseSchema()
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Question generation failed with status ${response.status}`);
      }

      const payload = GeminiResponseSchema.parse(await response.json());
      const text = payload.candidates[0]?.content.parts[0]?.text;

      if (!text) {
        throw new Error('Question generation response did not include generated text');
      }

      const generated = GeneratedQuestionsSchema.parse(JSON.parse(text));

      return generated.questions.slice(0, input.questionCount).map((question) => ({
        id: crypto.randomUUID(),
        title: question.title,
        question: question.question,
        difficulty: input.level,
        type: input.type,
        rubric: question.rubric
      } satisfies InterviewQuestion));
    }
  };
}
