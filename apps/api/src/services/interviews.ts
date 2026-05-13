import type {
  CreateInterviewInput,
  CreateInterviewResponse,
  InterviewAnswer,
  InterviewQuestion,
  SubmitAnswerInput,
} from "@ai-interview/shared";
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { interviewAnswers, interviewQuestions, interviews } from "../db/schema";

function createMockQuestions(input: CreateInterviewInput): InterviewQuestion[] {
  const topic = input.topic ?? input.role;

  return Array.from({ length: input.questionCount }, (_, index) => {
    const questionNumber = index + 1;

    return {
      id: crypto.randomUUID(),
      title: `${topic} question ${questionNumber}`,
      question: `Mock question ${questionNumber}: For a ${input.level} ${input.role}, explain an important ${topic} concept and include one practical example.`,
      difficulty: input.level,
      type: input.type,
      rubric: {
        excellent:
          "Clear, accurate answer with a practical example and relevant tradeoffs.",
        good: "Mostly accurate answer with some detail and at least one concrete example.",
        weak: "Vague, incomplete, or missing a practical example.",
      },
    };
  });
}

export async function createInterview(
  input: CreateInterviewInput,
  db: Database,
): Promise<CreateInterviewResponse> {
  const interview: CreateInterviewResponse = {
    id: crypto.randomUUID(),
    status: "created",
    input,
    questions: createMockQuestions(input),
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
