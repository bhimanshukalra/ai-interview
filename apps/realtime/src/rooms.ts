import type { CodeEditorLanguage, CodeRoomParticipant } from '@ai-interview/shared';
import * as Y from 'yjs';

export type ActiveCodeRoom = {
  doc: Y.Doc;
  interviewId: string;
  language: CodeEditorLanguage;
  participants: Map<string, CodeRoomParticipant>;
  questionId: string;
  roomId: string;
};

const defaultCode = "console.log('Hello world');";
const defaultLanguage = 'typescript';

const rooms = new Map<string, ActiveCodeRoom>();

export function getActiveCodeRoom(roomId: string): ActiveCodeRoom | null {
  return rooms.get(roomId) ?? null;
}

export function getOrCreateCodeRoom(interviewId: string, questionId: string, roomId: string): ActiveCodeRoom {
  const existingRoom = rooms.get(roomId);

  if (existingRoom) {
    return existingRoom;
  }

  const doc = new Y.Doc();
  doc.getText('code').insert(0, defaultCode);

  const room: ActiveCodeRoom = {
    doc,
    interviewId,
    language: defaultLanguage,
    participants: new Map<string, CodeRoomParticipant>(),
    questionId,
    roomId,
  };

  rooms.set(roomId, room);

  return room;
}

export function removeCodeRoomIfEmpty(room: ActiveCodeRoom): void {
  if (room.participants.size > 0) {
    return;
  }

  room.doc.destroy();
  rooms.delete(room.roomId);
}

export function getCodeRoomParticipants(room: ActiveCodeRoom): CodeRoomParticipant[] {
  return Array.from(room.participants.values());
}
