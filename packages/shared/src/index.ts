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

export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(8000)
});

export const InterviewAnswerSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  questionId: z.string(),
  answer: z.string()
});

export const InterviewAnswersResponseSchema = z.object({
  answers: z.array(InterviewAnswerSchema)
});

export const AnswerEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  followUpQuestion: z.string().optional()
});

export const InterviewAnswerEvaluationSchema = AnswerEvaluationSchema.extend({
  id: z.string(),
  interviewId: z.string(),
  questionId: z.string(),
  answerId: z.string()
});

export const InterviewReportResponseSchema = z.object({
  interviewId: z.string(),
  overallScore: z.number().min(0).max(10),
  answeredQuestions: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
  evaluations: z.array(InterviewAnswerEvaluationSchema)
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type CreateInterviewResponse = z.infer<typeof CreateInterviewResponseSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
export type InterviewAnswer = z.infer<typeof InterviewAnswerSchema>;
export type InterviewAnswersResponse = z.infer<typeof InterviewAnswersResponseSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type InterviewAnswerEvaluation = z.infer<typeof InterviewAnswerEvaluationSchema>;
export type InterviewReportResponse = z.infer<typeof InterviewReportResponseSchema>;
