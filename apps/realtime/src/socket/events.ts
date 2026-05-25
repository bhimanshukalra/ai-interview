import {
  AwarenessUpdatePayloadSchema,
  BroadcastAwarenessUpdatePayloadSchema,
  BroadcastYjsUpdatePayloadSchema,
  createCodeRoomId,
  JoinCodeRoomPayloadSchema,
  ParticipantsChangePayloadSchema,
  CodeRoomSocketEvent,
  YjsSyncPayloadSchema,
  YjsUpdatePayloadSchema,
} from '@ai-interview/shared';
import * as Y from 'yjs';
import { canAccessCodeRoom, type RealtimeDatabase } from '../db';
import {
  getActiveCodeRoom,
  getCodeRoomParticipants,
  removeCodeRoomIfEmpty,
  type ActiveCodeRoom,
} from '../rooms';
import { getOrLoadCodeRoom } from '../rooms/room-loader';
import {
  flushRoomSnapshot,
  scheduleRoomSnapshotSave,
} from '../rooms/room-persistence';
import { emitRoomError } from './errors';
import type { CodeRoomServer, CodeRoomSocket } from './types';

type RegisterCodeRoomEventsInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
};

export function registerCodeRoomEvents({ db, io }: RegisterCodeRoomEventsInput): void {
  io.on(CodeRoomSocketEvent.Connection, function handleConnection(socket) {
    socket.on(CodeRoomSocketEvent.JoinCodeRoom, async function handleJoinCodeRoom(rawPayload) {
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
    });

    socket.on(CodeRoomSocketEvent.YjsUpdate, function handleYjsUpdate(rawPayload) {
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
      scheduleRoomSnapshotSave(room, (roomToSave) => flushRoomSnapshotForSocket(socket, db, roomToSave));

      socket.to(roomId).emit(
        CodeRoomSocketEvent.YjsUpdate,
        BroadcastYjsUpdatePayloadSchema.parse({
          interviewId,
          questionId,
          update,
          updatedBy: socket.id,
        }),
      );
    });

    socket.on(CodeRoomSocketEvent.AwarenessUpdate, function handleAwarenessUpdate(rawPayload) {
      const parsedPayload = AwarenessUpdatePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        emitRoomError(socket, 'INVALID_UPDATE', 'Invalid awareness update payload.');
        return;
      }

      const { interviewId, questionId, update } = parsedPayload.data;
      const roomId = createCodeRoomId({ interviewId, questionId });
      const room = getActiveCodeRoom(roomId);

      if (!isAuthorizedForRoom(socket, roomId)) {
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
    });

    socket.on(CodeRoomSocketEvent.Disconnect, function handleDisconnect() {
      void handleSocketDisconnect(socket, io, db);
    });
  });
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

function emitParticipantsChange(io: CodeRoomServer, room: ActiveCodeRoom): void {
  io.to(room.roomId).emit(
    CodeRoomSocketEvent.ParticipantsChange,
    ParticipantsChangePayloadSchema.parse({
      interviewId: room.interviewId,
      questionId: room.questionId,
      participants: getCodeRoomParticipants(room),
    }),
  );
}

function isAuthorizedForRoom(socket: CodeRoomSocket, roomId: string): boolean {
  return Boolean(socket.data.authorizedRoomIds?.has(roomId));
}

async function checkCodeRoomAccess(
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

async function handleSocketDisconnect(
  socket: CodeRoomSocket,
  io: CodeRoomServer,
  db: RealtimeDatabase | null,
): Promise<void> {
  const roomId = socket.data.roomId;

  if (!roomId) {
    return;
  }

  const room = getActiveCodeRoom(roomId);

  if (!room) {
    return;
  }

  room.participants.delete(socket.id);
  emitParticipantsChange(io, room);

  if (room.participants.size === 0) {
    await flushRoomSnapshotForSocket(socket, db, room);
  }

  removeCodeRoomIfEmpty(room);
}

async function flushRoomSnapshotForSocket(
  socket: CodeRoomSocket,
  db: RealtimeDatabase | null,
  room: ActiveCodeRoom,
): Promise<void> {
  const saved = await flushRoomSnapshot({ db, room });

  if (!saved) {
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not save the latest code room snapshot.');
  }
}
