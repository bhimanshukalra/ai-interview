import {
  BroadcastLanguageChangePayloadSchema,
  CodeRoomSocketEvent,
  createCodeRoomId,
  LanguageChangePayloadSchema,
} from '@ai-interview/shared';
import type { RealtimeDatabase } from '../../db';
import { logRealtimeWarning } from '../../logger';
import { getActiveCodeRoom } from '../../rooms';
import { scheduleRoomSnapshotSave } from '../../rooms/room-persistence';
import { canEditRoom, isAuthorizedForRoom } from '../authorization';
import { emitRoomError } from '../errors';
import { flushRoomSnapshotForSocket } from './disconnect';
import type { CodeRoomSocket } from '../types';

type HandleLanguageChangeInput = {
  db: RealtimeDatabase | null;
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

export function handleLanguageChange({ db, rawPayload, socket }: HandleLanguageChangeInput): void {
  const parsedPayload = LanguageChangePayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    logRealtimeWarning('code room language change rejected: malformed payload', { socketId: socket.id });
    emitRoomError(socket, 'INVALID_UPDATE', 'Invalid language change payload.');
    return;
  }

  const { interviewId, language, questionId } = parsedPayload.data;
  const roomId = createCodeRoomId({ interviewId, questionId });
  const room = getActiveCodeRoom(roomId);

  if (!isAuthorizedForRoom(socket, roomId)) {
    logRealtimeWarning('code room language change rejected: forbidden', {
      interviewId,
      questionId,
      roomId,
      socketId: socket.id,
      userId: socket.data.user?.id,
    });
    emitRoomError(socket, 'FORBIDDEN', 'You do not have permission to update this code room.');
    return;
  }

  if (!canEditRoom(socket, roomId)) {
    logRealtimeWarning('code room language change rejected: read-only participant', {
      interviewId,
      questionId,
      roomId,
      socketId: socket.id,
      userId: socket.data.user?.id,
    });
    emitRoomError(socket, 'FORBIDDEN', 'You can view this code room, but you do not have edit access.');
    return;
  }

  if (!room) {
    emitRoomError(socket, 'NOT_FOUND', 'Code room was not found.');
    return;
  }

  room.language = language;
  scheduleRoomSnapshotSave(room, (roomToSave) => flushRoomSnapshotForSocket({ db, room: roomToSave, socket }));

  socket.to(roomId).emit(
    CodeRoomSocketEvent.LanguageChange,
    BroadcastLanguageChangePayloadSchema.parse({
      interviewId,
      language,
      questionId,
      updatedBy: socket.id,
    }),
  );
}
