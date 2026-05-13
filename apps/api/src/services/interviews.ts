import type {
  CreateInterviewInput,
  CreateInterviewResponse,
  InterviewAnswer,
  InterviewAnswerEvaluation,
  InterviewQuestion,
  InterviewReportResponse,
  SubmitAnswerInput,
} from "@ai-interview/shared";
import { InterviewLevelSchema, InterviewTypeSchema } from "@ai-interview/shared";
import type { AnswerEvaluationConfig } from "../ai/answer-evaluator";
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { answerEvaluations, interviewAnswers, interviewQuestions, interviews } from "../db/schema";
import { evaluateInterviewAnswer } from "./answer-evaluation";
import { generateInterviewQuestions } from "./question-generation";

type AnswerEvaluationRow = typeof answerEvaluations.$inferSelect;
type IndexedInterviewQuestion = InterviewQuestion & { index: number };

function mapInterviewQuestion(question: typeof interviewQuestions.$inferSelect): InterviewQuestion {
  return {
    id: question.id,
    title: question.title,
    question: question.question,
    difficulty: InterviewLevelSchema.parse(question.difficulty),
    type: InterviewTypeSchema.parse(question.type),
    rubric: {
      excellent: question.rubricExcellent,
      good: question.rubricGood,
      weak: question.rubricWeak,
    },
  };
}

function mapInterviewAnswer(answer: typeof interviewAnswers.$inferSelect): InterviewAnswer {
  return {
    id: answer.id,
    interviewId: answer.interviewId,
    questionId: answer.questionId,
    answer: answer.answer,
  };
}

function calculateOverallScore(evaluations: InterviewAnswerEvaluation[]): number {
  if (evaluations.length === 0) {
    return 0;
  }

  const totalScore = evaluations.reduce((total, evaluation) => total + evaluation.score, 0);

  return Number((totalScore / evaluations.length).toFixed(1));
}

function mapEvaluationsToReportItems(
  evaluations: AnswerEvaluationRow[],
  questions: InterviewQuestion[],
  answers: InterviewAnswer[],
): InterviewAnswerEvaluation[] {
  const questionById = new Map<string, IndexedInterviewQuestion>(
    questions.map((question, index) => [question.id, { ...question, index }])
  );
  const answerById = new Map(answers.map((answer) => [answer.id, answer]));

  return evaluations
    .map((evaluation) => {
      const question = questionById.get(evaluation.questionId);
      const answer = answerById.get(evaluation.answerId);

      return {
        id: evaluation.id,
        interviewId: evaluation.interviewId,
        questionId: evaluation.questionId,
        questionTitle: question?.title ?? 'Interview question',
        question: question?.question ?? 'Question unavailable.',
        answerId: evaluation.answerId,
        answer: answer?.answer ?? '',
        score: evaluation.score,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        followUpQuestion: evaluation.followUpQuestion ?? undefined,
      };
    })
    .sort((left, right) => {
      const leftIndex = questionById.get(left.questionId)?.index ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = questionById.get(right.questionId)?.index ?? Number.MAX_SAFE_INTEGER;

      return leftIndex - rightIndex;
    });
}

export class InterviewNotReadyError extends Error {
  constructor(
    readonly answeredQuestions: number,
    readonly totalQuestions: number,
  ) {
    super("All questions must be answered before generating a report.");
    this.name = "InterviewNotReadyError";
  }
}

export async function createInterview(
  input: CreateInterviewInput,
  userId: string,
  db: Database,
  questionGeneration: {
    provider?: "mock" | "gemini";
    apiKey?: string;
    model?: string;
    fallbackToMock?: boolean;
  } = {},
): Promise<CreateInterviewResponse> {
  const interview: CreateInterviewResponse = {
    id: crypto.randomUUID(),
    status: "created",
    input,
    questions: await generateInterviewQuestions(input, {
      provider: questionGeneration.provider,
      apiKey: questionGeneration.apiKey,
      model: questionGeneration.model,
      fallbackToMock: questionGeneration.fallbackToMock,
    }),
  };

  await db.insert(interviews).values({
    id: interview.id,
    userId,
    status: interview.status,
    role: interview.input.role,
    level: interview.input.level,
    type: interview.input.type,
    topic: interview.input.topic,
    questionCount: interview.input.questionCount,
  });

  await db.insert(interviewQuestions).values(
    interview.questions.map((question, index) => ({
      id: question.id,
      interviewId: interview.id,
      position: index,
      title: question.title,
      question: question.question,
      difficulty: question.difficulty,
      type: question.type,
      rubricExcellent: question.rubric.excellent,
      rubricGood: question.rubric.good,
      rubricWeak: question.rubric.weak,
    })),
  );

  return interview;
}

export async function getInterview(
  id: string,
  userId: string,
  db: Database,
): Promise<CreateInterviewResponse | null> {
  const [interview] = await db
    .select()
    .from(interviews)
    .where(and(eq(interviews.id, id), eq(interviews.userId, userId)))
    .limit(1);

  if (!interview) {
    return null;
  }

  const questions = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.interviewId, id))
    .orderBy(asc(interviewQuestions.position));

  return {
    id: interview.id,
    status: "created",
    input: {
      role: interview.role,
      level: InterviewLevelSchema.parse(interview.level),
      type: InterviewTypeSchema.parse(interview.type),
      topic: interview.topic ?? undefined,
      questionCount: interview.questionCount,
    },
    questions: questions.map(mapInterviewQuestion),
  };
}

export async function listInterviewAnswers(
  interviewId: string,
  userId: string,
  db: Database,
): Promise<InterviewAnswer[] | null> {
  const interview = await getInterview(interviewId, userId, db);

  if (!interview) {
    return null;
  }

  const answers = await db
    .select()
    .from(interviewAnswers)
    .where(eq(interviewAnswers.interviewId, interviewId));

  return answers.map(mapInterviewAnswer);
}

export async function submitInterviewAnswer(
  interviewId: string,
  userId: string,
  input: SubmitAnswerInput,
  db: Database,
): Promise<InterviewAnswer | null> {
  const [question] = await db
    .select({ id: interviewQuestions.id })
    .from(interviewQuestions)
    .innerJoin(interviews, eq(interviews.id, interviewQuestions.interviewId))
    .where(
      and(
        eq(interviewQuestions.id, input.questionId),
        eq(interviewQuestions.interviewId, interviewId),
        eq(interviews.userId, userId),
      ),
    )
    .limit(1);

  if (!question) {
    return null;
  }

  const [answer] = await db
    .insert(interviewAnswers)
    .values({
      id: crypto.randomUUID(),
      interviewId,
      questionId: input.questionId,
      answer: input.answer,
    })
    .onConflictDoUpdate({
      target: [interviewAnswers.interviewId, interviewAnswers.questionId],
      set: {
        answer: input.answer,
        updatedAt: new Date(),
      },
    })
    .returning();

  return mapInterviewAnswer(answer);
}

export async function evaluateInterview(
  interviewId: string,
  userId: string,
  db: Database,
  answerEvaluation: AnswerEvaluationConfig = {},
): Promise<InterviewReportResponse | null> {
  const interview = await getInterview(interviewId, userId, db);

  if (!interview) {
    return null;
  }

  const answers = await listInterviewAnswers(interviewId, userId, db);

  if (!answers) {
    return null;
  }

  const answeredQuestionIds = new Set(
    answers.filter((answer) => answer.answer.trim().length > 0).map((answer) => answer.questionId),
  );

  if (answeredQuestionIds.size < interview.questions.length) {
    throw new InterviewNotReadyError(answeredQuestionIds.size, interview.questions.length);
  }

  for (const answer of answers) {
    const evaluation = await evaluateInterviewAnswer(answer, interview, answerEvaluation);

    await db
      .insert(answerEvaluations)
      .values({
        id: crypto.randomUUID(),
        interviewId,
        questionId: answer.questionId,
        answerId: answer.id,
        score: evaluation.score,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        followUpQuestion: evaluation.followUpQuestion,
      })
      .onConflictDoUpdate({
        target: answerEvaluations.answerId,
        set: {
          score: evaluation.score,
          summary: evaluation.summary,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          followUpQuestion: evaluation.followUpQuestion,
          updatedAt: new Date(),
        },
      });
  }

  return getInterviewReport(interviewId, userId, db);
}

export async function getInterviewReport(
  interviewId: string,
  userId: string,
  db: Database,
): Promise<InterviewReportResponse | null> {
  const interview = await getInterview(interviewId, userId, db);

  if (!interview) {
    return null;
  }

  const evaluations = await db
    .select()
    .from(answerEvaluations)
    .where(eq(answerEvaluations.interviewId, interviewId));
  const answers = await listInterviewAnswers(interviewId, userId, db);

  if (!answers) {
    return null;
  }

  const mappedEvaluations = mapEvaluationsToReportItems(evaluations, interview.questions, answers);

  return {
    interviewId,
    overallScore: calculateOverallScore(mappedEvaluations),
    answeredQuestions: mappedEvaluations.length,
    totalQuestions: interview.questions.length,
    evaluations: mappedEvaluations,
  };
}
