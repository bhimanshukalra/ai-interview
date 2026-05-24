import { neon } from '@neondatabase/serverless';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from './auth';

const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
});

const interviews = pgTable('interviews', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
});

const interviewQuestions = pgTable('interview_questions', {
  id: text('id').primaryKey(),
  interviewId: text('interview_id').notNull(),
});

export type RealtimeDatabase = ReturnType<typeof createRealtimeDb>;

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
): Promise<boolean> {
  const [room] = await db
    .select({ questionId: interviewQuestions.id })
    .from(interviewQuestions)
    .innerJoin(interviews, eq(interviews.id, interviewQuestions.interviewId))
    .where(
      and(
        eq(interviews.id, input.interviewId),
        eq(interviews.userId, input.userId),
        eq(interviewQuestions.id, input.questionId),
      )
    )
    .limit(1);

  return Boolean(room);
}
