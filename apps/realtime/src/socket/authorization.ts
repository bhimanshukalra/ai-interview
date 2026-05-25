import { canAccessCodeRoom, type RealtimeDatabase } from '../db';
import type { CodeRoomSocket } from './types';

export function isAuthorizedForRoom(socket: CodeRoomSocket, roomId: string): boolean {
  return Boolean(socket.data.authorizedRoomIds?.has(roomId));
}

export async function checkCodeRoomAccess(
  db: RealtimeDatabase,
  interviewId: string,
  questionId: string,
  userId: string,
): Promise<boolean | null> {
  try {
    return await canAccessCodeRoom(db, { interviewId, questionId, userId });
  } catch {
    return null;
  }
}
