import type { CodeEditorLanguage, CodeRoomParticipant } from '@ai-interview/shared';
import * as Y from 'yjs';

export type ActiveCodeRoom = {
  doc: Y.Doc;
  interviewId: string;
  language: CodeEditorLanguage;
  participants: Map<string, CodeRoomParticipant>;
  questionId: string;
  roomId: string;
  saveTimer?: ReturnType<typeof setTimeout>;
};

const defaultCode = "console.log('Hello world');";
const defaultLanguage = 'typescript';

const rooms = new Map<string, ActiveCodeRoom>();

export function getActiveCodeRoom(roomId: string): ActiveCodeRoom | null {
  return rooms.get(roomId) ?? null;
}

export function createCodeRoom(input: {
  doc: Y.Doc;
  interviewId: string;
  language: CodeEditorLanguage;
  questionId: string;
  roomId: string;
}): ActiveCodeRoom {
  const room: ActiveCodeRoom = {
    doc: input.doc,
    interviewId: input.interviewId,
    language: input.language,
    participants: new Map<string, CodeRoomParticipant>(),
    questionId: input.questionId,
    roomId: input.roomId,
  };

  rooms.set(input.roomId, room);

  return room;
}

export function getOrCreateDefaultCodeRoom(interviewId: string, questionId: string, roomId: string): ActiveCodeRoom {
  const existingRoom = rooms.get(roomId);

  if (existingRoom) {
    return existingRoom;
  }

  const doc = new Y.Doc();
  doc.getText('code').insert(0, defaultCode);

  return createCodeRoom({ doc, interviewId, language: defaultLanguage, questionId, roomId });
}

export function removeCodeRoomIfEmpty(room: ActiveCodeRoom): void {
  if (room.participants.size > 0) {
    return;
  }

  room.doc.destroy();
  rooms.delete(room.roomId);
}

export function clearCodeRoomSaveTimer(room: ActiveCodeRoom): void {
  if (!room.saveTimer) {
    return;
  }

  clearTimeout(room.saveTimer);
  room.saveTimer = undefined;
}

export function getCodeRoomParticipants(room: ActiveCodeRoom): CodeRoomParticipant[] {
  return Array.from(room.participants.values());
}

export function createDefaultCodeDocument(): Y.Doc {
  const doc = new Y.Doc();
  doc.getText('code').insert(0, defaultCode);

  return doc;
}

export function createCodeDocumentFromText(code: string): Y.Doc {
  const doc = new Y.Doc();
  doc.getText('code').insert(0, code);

  return doc;
}
