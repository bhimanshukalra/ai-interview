import { createCodeRoomId } from '@ai-interview/shared';
import * as Y from 'yjs';
import {
  type RealtimeDatabase,
  loadCodeRoomDocument,
  loadSavedAnswerCode,
} from '../db';
import { logRealtimeWarning } from '../logger';
import {
  createCodeDocumentFromText,
  createCodeRoom,
  createDefaultCodeDocument,
  getActiveCodeRoom,
  getOrCreateDefaultCodeRoom,
  type ActiveCodeRoom,
} from '../rooms';

type GetOrLoadCodeRoomInput = {
  db: RealtimeDatabase | null;
  interviewId: string;
  questionId: string;
};

export async function getOrLoadCodeRoom({
  db,
  interviewId,
  questionId,
}: GetOrLoadCodeRoomInput): Promise<ActiveCodeRoom | null> {
  const roomId = createCodeRoomId({ interviewId, questionId });
  const activeRoom = getActiveCodeRoom(roomId);

  if (activeRoom) {
    return activeRoom;
  }

  if (!db) {
    return getOrCreateDefaultCodeRoom(interviewId, questionId, roomId);
  }

  try {
    const persistedDocument = await loadCodeRoomDocument(db, { interviewId, questionId });

    if (persistedDocument) {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, Buffer.from(persistedDocument.yjsSnapshot, 'base64'));

      return createCodeRoom({
        doc,
        interviewId,
        language: persistedDocument.language,
        questionId,
        roomId,
      });
    }

    const savedAnswerCode = await loadSavedAnswerCode(db, { interviewId, questionId });

    if (savedAnswerCode) {
      return createCodeRoom({
        doc: createCodeDocumentFromText(savedAnswerCode.code),
        interviewId,
        language: savedAnswerCode.language,
        questionId,
        roomId,
      });
    }

    return createCodeRoom({
      doc: createDefaultCodeDocument(),
      interviewId,
      language: 'typescript',
      questionId,
      roomId,
    });
  } catch (error) {
    logRealtimeWarning('code room load failed', {
      error: error instanceof Error ? error.message : String(error),
      interviewId,
      questionId,
      roomId,
    });
    return null;
  }
}
