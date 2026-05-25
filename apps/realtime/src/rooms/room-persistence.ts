import * as Y from 'yjs';
import type { RealtimeDatabase } from '../db';
import { upsertCodeRoomDocumentSnapshot } from '../db';
import { clearCodeRoomSaveTimer, type ActiveCodeRoom } from '../rooms';

const saveSnapshotDelayMs = 500;

type FlushRoomSnapshotInput = {
  db: RealtimeDatabase | null;
  room: ActiveCodeRoom;
};

export function scheduleRoomSnapshotSave(
  room: ActiveCodeRoom,
  flushRoomSnapshot: (room: ActiveCodeRoom) => Promise<void>,
): void {
  clearCodeRoomSaveTimer(room);

  room.saveTimer = setTimeout(() => {
    void flushRoomSnapshot(room);
  }, saveSnapshotDelayMs);
}

export async function flushRoomSnapshot({ db, room }: FlushRoomSnapshotInput): Promise<boolean> {
  clearCodeRoomSaveTimer(room);

  if (!db) {
    return true;
  }

  try {
    await upsertCodeRoomDocumentSnapshot(db, {
      interviewId: room.interviewId,
      language: room.language,
      questionId: room.questionId,
      yjsSnapshot: Buffer.from(Y.encodeStateAsUpdate(room.doc)).toString('base64'),
    });

    return true;
  } catch {
    return false;
  }
}
