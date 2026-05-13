import type {
  CreateInterviewInput,
  CreateInterviewResponse,
  InterviewAnswer,
  InterviewAnswerEvaluation,
  InterviewReportResponse,
  SubmitAnswerInput,
} from "@ai-interview/shared";
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { answerEvaluations, interviewAnswers, interviewQuestions, interviews } from "../db/schema";
import { generateInterviewQuestions } from "./question-generation";

export async function createInterview(
  input: CreateInterviewInput,
  db: Database,
  questionGeneration: {
    provider?: "mock" | "gemini";
    apiKey?: string;
    model?: string;
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
    }),
  };

  await db.insert(interviews).values({
    id: interview.id,
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
  db: Database,
): Promise<CreateInterviewResponse | null> {
  const [interview] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, id))
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
      level: interview.level as CreateInterviewInput["level"],
      type: interview.type as CreateInterviewInput["type"],
      topic: interview.topic ?? undefined,
      questionCount: interview.questionCount,
    },
    questions: questions.map((question) => ({
      id: question.id,
      title: question.title,
      question: question.question,
      difficulty: question.difficulty as CreateInterviewInput["level"],
      type: question.type as CreateInterviewInput["type"],
      rubric: {
        excellent: question.rubricExcellent,
        good: question.rubricGood,
        weak: question.rubricWeak,
      },
    })),
  };
}

export async function listInterviewAnswers(
  interviewId: string,
  db: Database,
): Promise<InterviewAnswer[]> {
  const answers = await db
    .select()
    .from(interviewAnswers)
    .where(eq(interviewAnswers.interviewId, interviewId));

  return answers.map((answer) => ({
    id: answer.id,
    interviewId: answer.interviewId,
    questionId: answer.questionId,
    answer: answer.answer,
  }));
}

export async function submitInterviewAnswer(
  interviewId: string,
  input: SubmitAnswerInput,
  db: Database,
): Promise<InterviewAnswer | null> {
  const [question] = await db
    .select({ id: interviewQuestions.id })
    .from(interviewQuestions)
    .where(
      and(
        eq(interviewQuestions.id, input.questionId),
        eq(interviewQuestions.interviewId, interviewId),
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

  return {
    id: answer.id,
    interviewId: answer.interviewId,
    questionId: answer.questionId,
    answer: answer.answer,
  };
}

function createMockEvaluation(answer: InterviewAnswer): Omit<InterviewAnswerEvaluation, "id" | "interviewId" | "questionId" | "answerId"> {
  const wordCount = answer.answer.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.max(3, Math.min(10, Math.round(wordCount / 12) + 3));

  return {
    score,
    summary:
      score >= 8
        ? "Strong answer with enough detail to evaluate the candidate's thinking."
        : score >= 6
          ? "Reasonable answer, but it would benefit from more specific examples and tradeoffs."
          : "The answer is too brief to show clear understanding.",
    strengths:
      score >= 7
        ? ["Communicates the core idea", "Includes enough detail to discuss further"]
        : ["Provides a starting point for discussion"],
    weaknesses:
      score >= 8
        ? ["Could still mention edge cases or tradeoffs"]
        : ["Needs more concrete examples", "Needs clearer reasoning"],
    followUpQuestion: "Can you give a concrete example from a real project or implementation?"
  };
}

export async function evaluateInterview(
  interviewId: string,
  db: Database,
): Promise<InterviewReportResponse | null> {
  const interview = await getInterview(interviewId, db);

  if (!interview) {
    return null;
  }

  const answers = await listInterviewAnswers(interviewId, db);

  for (const answer of answers) {
    const evaluation = createMockEvaluation(answer);

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

  return getInterviewReport(interviewId, db);
}

export async function getInterviewReport(
  interviewId: string,
  db: Database,
): Promise<InterviewReportResponse | null> {
  const interview = await getInterview(interviewId, db);

  if (!interview) {
    return null;
  }

  const evaluations = await db
    .select()
    .from(answerEvaluations)
    .where(eq(answerEvaluations.interviewId, interviewId));

  const mappedEvaluations: InterviewAnswerEvaluation[] = evaluations.map((evaluation) => ({
    id: evaluation.id,
    interviewId: evaluation.interviewId,
    questionId: evaluation.questionId,
    answerId: evaluation.answerId,
    score: evaluation.score,
    summary: evaluation.summary,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    followUpQuestion: evaluation.followUpQuestion ?? undefined,
  }));

  const overallScore =
    mappedEvaluations.length > 0
      ? Number(
          (
            mappedEvaluations.reduce((total, evaluation) => total + evaluation.score, 0) /
            mappedEvaluations.length
          ).toFixed(1),
        )
      : 0;

  return {
    interviewId,
    overallScore,
    answeredQuestions: mappedEvaluations.length,
    totalQuestions: interview.questions.length,
    evaluations: mappedEvaluations,
  };
}
