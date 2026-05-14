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

// Status reflects interview progress through answering and evaluation.
// `ready-for-report` means all questions are answered but not all evaluations exist yet.
// `report-ready` means every question has an evaluation and the report can be displayed.
export const InterviewSummaryStatusSchema = z.enum([
  'not-started',
  'in-progress',
  'ready-for-report',
  'report-ready'
]);

export function getInterviewSummaryStatus(
  answeredCount: number,
  evaluatedCount: number,
  questionCount: number
): z.infer<typeof InterviewSummaryStatusSchema> {
  if (evaluatedCount >= questionCount) {
    return 'report-ready';
  }

  if (answeredCount >= questionCount) {
    return 'ready-for-report';
  }

  if (answeredCount > 0) {
    return 'in-progress';
  }

  return 'not-started';
}

// Compact history view of an interview. Count, score, and status fields are
// derived from submitted answers and completed evaluations, not stored user input.
export const InterviewSummarySchema = z.object({
  id: z.string(),
  role: z.string(),
  level: InterviewLevelSchema,
  type: InterviewTypeSchema,
  topic: z.string().optional(),
  questionCount: z.number().int().min(0),
  answeredCount: z.number().int().min(0),
  evaluatedCount: z.number().int().min(0),
  overallScore: z.number().min(0).max(10).nullable(),
  status: InterviewSummaryStatusSchema,
  createdAt: z.string()
});

export const ListInterviewsResponseSchema = z.object({
  interviews: z.array(InterviewSummarySchema)
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

// Structured evaluator output for one answer. The API stores and returns this
// shape so reports can render without depending on provider-specific AI text.
export const AnswerEvaluationSchema = z.object({
  score: z.number().int().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  followUpQuestion: z.string().optional()
});

export const InterviewAnswerEvaluationSchema = AnswerEvaluationSchema.extend({
  id: z.string(),
  interviewId: z.string(),
  questionId: z.string(),
  questionTitle: z.string(),
  question: z.string(),
  answerId: z.string(),
  answer: z.string()
});

// Full report payload for a completed/evaluated interview, including the
// original question and answer context needed to render each evaluation.
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
export type InterviewSummaryStatus = z.infer<typeof InterviewSummaryStatusSchema>;
export type InterviewSummary = z.infer<typeof InterviewSummarySchema>;
export type ListInterviewsResponse = z.infer<typeof ListInterviewsResponseSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
export type InterviewAnswer = z.infer<typeof InterviewAnswerSchema>;
export type InterviewAnswersResponse = z.infer<typeof InterviewAnswersResponseSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type InterviewAnswerEvaluation = z.infer<typeof InterviewAnswerEvaluationSchema>;
export type InterviewReportResponse = z.infer<typeof InterviewReportResponseSchema>;
