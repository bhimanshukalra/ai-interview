import type { CodeEditorLanguage } from '@ai-interview/shared';
import { CodeEditorLanguageSchema } from '@ai-interview/shared';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { interviewCodeDocuments } from '../db/schema';

type CodeRoomDocumentRow = typeof interviewCodeDocuments.$inferSelect;

export type CodeRoomDocument = {
  id: string;
  interviewId: string;
  questionId: string;
  language: CodeEditorLanguage;
  yjsSnapshot: string;
  createdAt: string;
  updatedAt: string;
};

export type CodeRoomDocumentInput = {
  interviewId: string;
  questionId: string;
};

export type UpsertCodeRoomDocumentInput = CodeRoomDocumentInput & {
  language: CodeEditorLanguage;
  yjsSnapshot: string;
};

function toIsoDateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapCodeRoomDocument(document: CodeRoomDocumentRow): CodeRoomDocument {
  return {
    id: document.id,
    interviewId: document.interviewId,
    questionId: document.questionId,
    language: CodeEditorLanguageSchema.parse(document.language),
    yjsSnapshot: document.yjsSnapshot,
    createdAt: toIsoDateString(document.createdAt),
    updatedAt: toIsoDateString(document.updatedAt)
  };
}

export async function loadCodeRoomDocument(
  db: Database,
  input: CodeRoomDocumentInput
): Promise<CodeRoomDocument | null> {
  const [document] = await db
    .select()
    .from(interviewCodeDocuments)
    .where(
      and(
        eq(interviewCodeDocuments.interviewId, input.interviewId),
        eq(interviewCodeDocuments.questionId, input.questionId)
      )
    )
    .limit(1);

  return document ? mapCodeRoomDocument(document) : null;
}

export async function upsertCodeRoomDocument(
  db: Database,
  input: UpsertCodeRoomDocumentInput
): Promise<CodeRoomDocument> {
  const [document] = await db
    .insert(interviewCodeDocuments)
    .values({
      id: crypto.randomUUID(),
      interviewId: input.interviewId,
      questionId: input.questionId,
      language: input.language,
      yjsSnapshot: input.yjsSnapshot
    })
    .onConflictDoUpdate({
      target: [interviewCodeDocuments.interviewId, interviewCodeDocuments.questionId],
      set: {
        language: input.language,
        yjsSnapshot: input.yjsSnapshot,
        updatedAt: new Date()
      }
    })
    .returning();

  return mapCodeRoomDocument(document);
}

export async function updateCodeRoomDocumentSnapshot(
  db: Database,
  input: UpsertCodeRoomDocumentInput
): Promise<CodeRoomDocument | null> {
  const [document] = await db
    .update(interviewCodeDocuments)
    .set({
      language: input.language,
      yjsSnapshot: input.yjsSnapshot,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(interviewCodeDocuments.interviewId, input.interviewId),
        eq(interviewCodeDocuments.questionId, input.questionId)
      )
    )
    .returning();

  return document ? mapCodeRoomDocument(document) : null;
}
