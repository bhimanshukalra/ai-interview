import { z } from 'zod';

export const InterviewLevelSchema = z.enum(['intern', 'junior', 'mid', 'senior']);
export const InterviewTypeSchema = z.enum(['behavioral', 'technical', 'system-design', 'mixed']);

export const CreateInterviewSchema = z.object({
  role: z.string().min(2).max(80),
  level: InterviewLevelSchema,
  type: InterviewTypeSchema,
  topic: z.string().max(120).optional(),
  questionCount: z.number().int().min(3).max(10).default(5)
});

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string(),
  difficulty: InterviewLevelSchema,
  type: InterviewTypeSchema,
  rubric: z.object({
    excellent: z.string(),
    good: z.string(),
    weak: z.string()
  })
});

export const CreateInterviewResponseSchema = z.object({
  id: z.string(),
  status: z.literal('created'),
  input: CreateInterviewSchema,
  questions: z.array(InterviewQuestionSchema)
});

export const AnswerEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  followUpQuestion: z.string().optional()
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type CreateInterviewResponse = z.infer<typeof CreateInterviewResponseSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
