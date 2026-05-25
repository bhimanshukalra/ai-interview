import {
  CodeRoomSocketEvent,
  JoinCodeRoomPayloadSchema,
  YjsSyncPayloadSchema,
  type CodeRoomAccess,
  type InterviewParticipantRole,
} from '@ai-interview/shared';
import * as Y from 'yjs';
import type { RealtimeDatabase } from '../../db';
import { logRealtimeInfo, logRealtimeWarning } from '../../logger';
import { getActiveCodeRoom, type ActiveCodeRoom } from '../../rooms';
import { getOrLoadCodeRoom } from '../../rooms/room-loader';
import { checkCodeRoomAccess } from '../authorization';
import { emitRoomError } from '../errors';
import { emitParticipantsChange } from '../participants';
import type { CodeRoomServer, CodeRoomSocket } from '../types';

type HandleJoinCodeRoomInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

export async function handleJoinCodeRoom({
  db,
  io,
  rawPayload,
  socket,
}: HandleJoinCodeRoomInput): Promise<void> {
  const parsedPayload = JoinCodeRoomPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitRoomError(socket, 'INVALID_UPDATE', 'Invalid room join payload.');
    return;
  }

  const user = socket.data.user;

  if (!user || !db) {
    logRealtimeWarning('code room join rejected: unauthenticated socket', { socketId: socket.id });
    emitRoomError(socket, 'UNAUTHORIZED', 'Please sign in again to join this code room.');
    return;
  }

  const { interviewId, questionId } = parsedPayload.data;
  const roomAccess = await checkCodeRoomAccess(db, interviewId, questionId, user.id);

  if (!roomAccess) {
    logRealtimeWarning('code room join rejected: forbidden', {
      interviewId,
      questionId,
      socketId: socket.id,
      userId: user.id,
    });
    emitRoomError(socket, 'FORBIDDEN', 'You do not have permission to join this code room.');
    return;
  }

  const room = await getOrLoadCodeRoom({ db, interviewId, questionId });

  if (!room) {
    logRealtimeWarning('code room join failed: room load failed', {
      interviewId,
      questionId,
      socketId: socket.id,
      userId: user.id,
    });
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not load this code room. Please try again.');
    return;
  }

  leavePreviousRoomIfNeeded(io, socket, room.roomId);
  joinSocketToRoom(socket, room, user.id, user.name, roomAccess.role, roomAccess.canEdit);
  logRealtimeInfo('code room joined', {
    canEdit: roomAccess.canEdit,
    participantCount: room.participants.size,
    role: roomAccess.role,
    roomId: room.roomId,
    socketId: socket.id,
    userId: user.id,
  });
  emitYjsSync(socket, room, roomAccess);
  emitParticipantsChange(io, room);
}

function leavePreviousRoomIfNeeded(io: CodeRoomServer, socket: CodeRoomSocket, nextRoomId: string): void {
  const previousRoomId = socket.data.roomId;

  if (!previousRoomId || previousRoomId === nextRoomId) {
    return;
  }

  const previousRoom = getActiveCodeRoom(previousRoomId);
  socket.leave(previousRoomId);
  socket.data.authorizedRoomIds?.delete(previousRoomId);
  socket.data.editableRoomIds?.delete(previousRoomId);

  if (!previousRoom) {
    return;
  }

  previousRoom.participants.delete(socket.id);
  emitParticipantsChange(io, previousRoom);
}

function joinSocketToRoom(
  socket: CodeRoomSocket,
  room: ActiveCodeRoom,
  userId: string,
  name: string,
  role: InterviewParticipantRole,
  canEdit: boolean,
): void {
  socket.join(room.roomId);
  socket.data.roomId = room.roomId;
  socket.data.authorizedRoomIds?.add(room.roomId);
  if (canEdit) {
    socket.data.editableRoomIds?.add(room.roomId);
  }

  room.participants.set(socket.id, {
    socketId: socket.id,
    userId,
    name,
    role,
    joinedAt: new Date().toISOString(),
  });
}

function emitYjsSync(socket: CodeRoomSocket, room: ActiveCodeRoom, access: CodeRoomAccess): void {
  socket.emit(
    CodeRoomSocketEvent.YjsSync,
    YjsSyncPayloadSchema.parse({
      access,
      interviewId: room.interviewId,
      questionId: room.questionId,
      update: Y.encodeStateAsUpdate(room.doc),
      language: room.language,
    }),
  );
}
