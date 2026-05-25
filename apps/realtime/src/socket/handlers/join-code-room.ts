import {
  CodeRoomSocketEvent,
  JoinCodeRoomPayloadSchema,
  YjsSyncPayloadSchema,
} from '@ai-interview/shared';
import * as Y from 'yjs';
import type { RealtimeDatabase } from '../../db';
import { type ActiveCodeRoom } from '../../rooms';
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
    emitRoomError(socket, 'UNAUTHORIZED', 'Please sign in again to join this code room.');
    return;
  }

  const { interviewId, questionId } = parsedPayload.data;
  const canAccessRoom = await checkCodeRoomAccess(db, interviewId, questionId, user.id);

  if (canAccessRoom === null) {
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not verify code room access. Please try again.');
    return;
  }

  if (!canAccessRoom) {
    emitRoomError(socket, 'FORBIDDEN', 'You do not have permission to join this code room.');
    return;
  }

  const room = await getOrLoadCodeRoom({ db, interviewId, questionId });

  if (!room) {
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not load this code room. Please try again.');
    return;
  }

  joinSocketToRoom(socket, room, user.id, user.name);
  emitYjsSync(socket, room);
  emitParticipantsChange(io, room);
}

function joinSocketToRoom(socket: CodeRoomSocket, room: ActiveCodeRoom, userId: string, name: string): void {
  socket.join(room.roomId);
  socket.data.roomId = room.roomId;
  socket.data.authorizedRoomIds?.add(room.roomId);

  room.participants.set(socket.id, {
    socketId: socket.id,
    userId,
    name,
    joinedAt: new Date().toISOString(),
  });
}

function emitYjsSync(socket: CodeRoomSocket, room: ActiveCodeRoom): void {
  socket.emit(
    CodeRoomSocketEvent.YjsSync,
    YjsSyncPayloadSchema.parse({
      interviewId: room.interviewId,
      questionId: room.questionId,
      update: Y.encodeStateAsUpdate(room.doc),
      language: room.language,
    }),
  );
}
