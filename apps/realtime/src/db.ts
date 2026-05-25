import { neon } from '@neondatabase/serverless';
import {
  CodeEditorLanguageSchema,
  InterviewParticipantRoleSchema,
  type CodeEditorLanguage,
  type CodeRoomAccess,
} from '@ai-interview/shared';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from './auth';

const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
});

const interviews = pgTable('interviews', {
  id: text('id').primaryKey(),
  questionCount: integer('question_count').notNull(),
  userId: text('user_id').notNull(),
});

const interviewQuestions = pgTable('interview_questions', {
  id: text('id').primaryKey(),
  interviewId: text('interview_id').notNull(),
});

const interviewAnswers = pgTable('interview_answers', {
  interviewId: text('interview_id').notNull(),
  questionId: text('question_id').notNull(),
  code: text('code'),
  codeLanguage: text('code_language'),
});

const answerEvaluations = pgTable('answer_evaluations', {
  interviewId: text('interview_id').notNull(),
  questionId: text('question_id').notNull(),
});

const interviewParticipants = pgTable('interview_participants', {
  interviewId: text('interview_id').notNull(),
  role: text('role').notNull(),
  userId: text('user_id').notNull(),
});

const interviewCodeDocuments = pgTable('interview_code_documents', {
  id: text('id').primaryKey(),
  interviewId: text('interview_id').notNull(),
  questionId: text('question_id').notNull(),
  language: text('language').notNull(),
  yjsSnapshot: text('yjs_snapshot').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RealtimeDatabase = ReturnType<typeof createRealtimeDb>;

export type PersistedCodeRoomDocument = {
  language: CodeEditorLanguage;
  yjsSnapshot: string;
};

export type SavedAnswerCode = {
  code: string;
  language: CodeEditorLanguage;
};

export function createRealtimeDb(databaseUrl: string): ReturnType<typeof drizzle> {
  return drizzle(neon(databaseUrl));
}

export async function findRealtimeUser(db: RealtimeDatabase, userId: string): Promise<AuthenticatedUser | null> {
  const [user] = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function canAccessCodeRoom(
  db: RealtimeDatabase,
  input: { interviewId: string; questionId: string; userId: string }
): Promise<CodeRoomAccess | null> {
  const [room] = await db
    .select({
      ownerId: interviews.userId,
      participantRole: interviewParticipants.role,
      questionCount: interviews.questionCount,
      questionId: interviewQuestions.id,
    })
    .from(interviewQuestions)
    .innerJoin(interviews, eq(interviews.id, interviewQuestions.interviewId))
    .leftJoin(
      interviewParticipants,
      and(
        eq(interviewParticipants.interviewId, interviews.id),
        eq(interviewParticipants.userId, input.userId),
      ),
    )
    .where(
      and(
        eq(interviews.id, input.interviewId),
        eq(interviewQuestions.id, input.questionId),
      )
    )
    .limit(1);

  if (!room) {
    return null;
  }

  const canEditActiveInterview = !(await hasCompleteInterviewEvaluation(db, {
    interviewId: input.interviewId,
    questionCount: room.questionCount,
  }));

  if (room.ownerId === input.userId) {
    return { canEdit: canEditActiveInterview, role: 'candidate' };
  }

  if (!room.participantRole) {
    return null;
  }

  const role = InterviewParticipantRoleSchema.parse(room.participantRole);

  return {
    canEdit: role === 'candidate' && canEditActiveInterview,
    role,
  };
}

async function hasCompleteInterviewEvaluation(
  db: RealtimeDatabase,
  input: { interviewId: string; questionCount: number }
): Promise<boolean> {
  const evaluations = await db
    .select({ questionId: answerEvaluations.questionId })
    .from(answerEvaluations)
    .where(eq(answerEvaluations.interviewId, input.interviewId));

  return new Set(evaluations.map((evaluation) => evaluation.questionId)).size >= input.questionCount;
}

export async function loadCodeRoomDocument(
  db: RealtimeDatabase,
  input: { interviewId: string; questionId: string }
): Promise<PersistedCodeRoomDocument | null> {
  const [document] = await db
    .select({
      language: interviewCodeDocuments.language,
      yjsSnapshot: interviewCodeDocuments.yjsSnapshot,
    })
    .from(interviewCodeDocuments)
    .where(
      and(
        eq(interviewCodeDocuments.interviewId, input.interviewId),
        eq(interviewCodeDocuments.questionId, input.questionId),
      )
    )
    .limit(1);

  if (!document) {
    return null;
  }

  return {
    language: CodeEditorLanguageSchema.parse(document.language),
    yjsSnapshot: document.yjsSnapshot,
  };
}

export async function loadSavedAnswerCode(
  db: RealtimeDatabase,
  input: { interviewId: string; questionId: string }
): Promise<SavedAnswerCode | null> {
  const [answer] = await db
    .select({
      code: interviewAnswers.code,
      codeLanguage: interviewAnswers.codeLanguage,
    })
    .from(interviewAnswers)
    .where(and(eq(interviewAnswers.interviewId, input.interviewId), eq(interviewAnswers.questionId, input.questionId)))
    .limit(1);

  if (!answer?.code?.trim() || !answer.codeLanguage) {
    return null;
  }

  return {
    code: answer.code,
    language: CodeEditorLanguageSchema.parse(answer.codeLanguage),
  };
}

export async function upsertCodeRoomDocumentSnapshot(
  db: RealtimeDatabase,
  input: {
    interviewId: string;
    language: CodeEditorLanguage;
    questionId: string;
    yjsSnapshot: string;
  }
): Promise<void> {
  await db
    .insert(interviewCodeDocuments)
    .values({
      id: crypto.randomUUID(),
      interviewId: input.interviewId,
      questionId: input.questionId,
      language: input.language,
      yjsSnapshot: input.yjsSnapshot,
    })
    .onConflictDoUpdate({
      target: [interviewCodeDocuments.interviewId, interviewCodeDocuments.questionId],
      set: {
        language: input.language,
        yjsSnapshot: input.yjsSnapshot,
        updatedAt: new Date(),
      },
    });
}
