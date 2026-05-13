import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const interviews = pgTable('interviews', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  role: text('role').notNull(),
  level: text('level').notNull(),
  type: text('type').notNull(),
  topic: text('topic'),
  questionCount: integer('question_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const interviewQuestions = pgTable('interview_questions', {
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
});

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('interview_answers_interview_question_unique').on(table.interviewId, table.questionId)]
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
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    weaknesses: jsonb('weaknesses').$type<string[]>().notNull(),
    followUpQuestion: text('follow_up_question'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('answer_evaluations_answer_unique').on(table.answerId)]
);
