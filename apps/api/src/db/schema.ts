import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)]
);

export const interviews = pgTable(
  'interviews',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    status: text('status').notNull(),
    role: text('role').notNull(),
    level: text('level').notNull(),
    type: text('type').notNull(),
    topic: text('topic'),
    questionCount: integer('question_count').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('interviews_user_id_idx').on(table.userId)]
);

export const interviewQuestions = pgTable(
  'interview_questions',
  {
    id: text('id').primaryKey(),
    interviewId: text('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    question: text('question').notNull(),
    difficulty: text('difficulty').notNull(),
    type: text('type').notNull(),
    rubricExcellent: text('rubric_excellent').notNull(),
    rubricGood: text('rubric_good').notNull(),
    rubricWeak: text('rubric_weak').notNull()
  },
  (table) => [index('interview_questions_interview_id_idx').on(table.interviewId)]
);

export const interviewAnswers = pgTable(
  'interview_answers',
  {
    id: text('id').primaryKey(),
    interviewId: text('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
    answer: text('answer').notNull(),
    code: text('code'),
    codeLanguage: text('code_language'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('interview_answers_interview_question_unique').on(table.interviewId, table.questionId)]
);

export const interviewCodeDocuments = pgTable(
  'interview_code_documents',
  {
    id: text('id').primaryKey(),
    interviewId: text('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    yjsSnapshot: text('yjs_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('interview_code_documents_interview_question_unique').on(table.interviewId, table.questionId),
    index('interview_code_documents_interview_id_idx').on(table.interviewId)
  ]
);

export const interviewParticipants = pgTable(
  'interview_participants',
  {
    id: text('id').primaryKey(),
    interviewId: text('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('interview_participants_interview_user_unique').on(table.interviewId, table.userId),
    index('interview_participants_interview_id_idx').on(table.interviewId),
    index('interview_participants_user_id_idx').on(table.userId)
  ]
);

export const answerEvaluations = pgTable(
  'answer_evaluations',
  {
    id: text('id').primaryKey(),
    interviewId: text('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
    answerId: text('answer_id')
      .notNull()
      .references(() => interviewAnswers.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    summary: text('summary').notNull(),
    signalBreakdown: jsonb('signal_breakdown').$type<{
      correctness: { score: number; note: string };
      clarity: { score: number; note: string };
      codeQuality: { score: number; note: string };
      tradeoffs: { score: number; note: string };
      edgeCases: { score: number; note: string };
      debugging: { score: number; note: string };
      systemsThinking: { score: number; note: string };
    }>(),
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    weaknesses: jsonb('weaknesses').$type<string[]>().notNull(),
    followUpQuestion: text('follow_up_question'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('answer_evaluations_answer_unique').on(table.answerId),
    index('answer_evaluations_interview_id_idx').on(table.interviewId)
  ]
);
