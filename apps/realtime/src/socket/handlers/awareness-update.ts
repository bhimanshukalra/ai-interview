import {
  AwarenessUpdatePayloadSchema,
  BroadcastAwarenessUpdatePayloadSchema,
  CodeRoomSocketEvent,
  createCodeRoomId,
} from '@ai-interview/shared';
import { logRealtimeWarning } from '../../logger';
import { getActiveCodeRoom } from '../../rooms';
import { isAuthorizedForRoom } from '../authorization';
import { emitRoomError } from '../errors';
import type { CodeRoomSocket } from '../types';

type HandleAwarenessUpdateInput = {
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

export function handleAwarenessUpdate({ rawPayload, socket }: HandleAwarenessUpdateInput): void {
  const parsedPayload = AwarenessUpdatePayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    logRealtimeWarning('code room awareness rejected: malformed payload', { socketId: socket.id });
    emitRoomError(socket, 'INVALID_UPDATE', 'Invalid awareness update payload.');
    return;
  }

  const { interviewId, questionId, update } = parsedPayload.data;
  const roomId = createCodeRoomId({ interviewId, questionId });
  const room = getActiveCodeRoom(roomId);

  if (!isAuthorizedForRoom(socket, roomId)) {
    logRealtimeWarning('code room awareness rejected: forbidden', {
      interviewId,
      questionId,
      roomId,
      socketId: socket.id,
      userId: socket.data.user?.id,
    });
    emitRoomError(socket, 'FORBIDDEN', 'You do not have permission to update awareness for this code room.');
    return;
  }

  if (!room) {
    emitRoomError(socket, 'NOT_FOUND', 'Code room was not found.');
    return;
  }

  socket.to(roomId).emit(
    CodeRoomSocketEvent.AwarenessUpdate,
    BroadcastAwarenessUpdatePayloadSchema.parse({
      interviewId,
      questionId,
      update,
      updatedBy: socket.id,
    }),
  );
}
