import {
  BroadcastYjsUpdatePayloadSchema,
  CodeRoomSocketEvent,
  createCodeRoomId,
  YjsUpdatePayloadSchema,
} from '@ai-interview/shared';
import * as Y from 'yjs';
import type { RealtimeDatabase } from '../../db';
import { getActiveCodeRoom } from '../../rooms';
import { scheduleRoomSnapshotSave } from '../../rooms/room-persistence';
import { isAuthorizedForRoom } from '../authorization';
import { emitRoomError } from '../errors';
import { flushRoomSnapshotForSocket } from './disconnect';
import type { CodeRoomSocket } from '../types';

type HandleYjsUpdateInput = {
  db: RealtimeDatabase | null;
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

export function handleYjsUpdate({ db, rawPayload, socket }: HandleYjsUpdateInput): void {
  const parsedPayload = YjsUpdatePayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitRoomError(socket, 'INVALID_UPDATE', 'Invalid Yjs update payload.');
    return;
  }

  const { interviewId, questionId, update } = parsedPayload.data;
  const roomId = createCodeRoomId({ interviewId, questionId });
  const room = getActiveCodeRoom(roomId);

  if (!isAuthorizedForRoom(socket, roomId)) {
    emitRoomError(socket, 'FORBIDDEN', 'You do not have permission to edit this code room.');
    return;
  }

  if (!room) {
    emitRoomError(socket, 'NOT_FOUND', 'Code room was not found.');
    return;
  }

  Y.applyUpdate(room.doc, update);
  scheduleRoomSnapshotSave(room, (roomToSave) => flushRoomSnapshotForSocket({ db, room: roomToSave, socket }));

  socket.to(roomId).emit(
    CodeRoomSocketEvent.YjsUpdate,
    BroadcastYjsUpdatePayloadSchema.parse({
      interviewId,
      questionId,
      update,
      updatedBy: socket.id,
    }),
  );
}
