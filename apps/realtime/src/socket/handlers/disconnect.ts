import type { RealtimeDatabase } from '../../db';
import {
  getActiveCodeRoom,
  removeCodeRoomIfEmpty,
  type ActiveCodeRoom,
} from '../../rooms';
import { logRealtimeInfo, logRealtimeWarning } from '../../logger';
import { flushRoomSnapshot } from '../../rooms/room-persistence';
import { emitRoomError } from '../errors';
import { emitParticipantsChange } from '../participants';
import type { CodeRoomServer, CodeRoomSocket } from '../types';

type HandleSocketDisconnectInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
  socket: CodeRoomSocket;
};

type FlushRoomSnapshotForSocketInput = {
  db: RealtimeDatabase | null;
  room: ActiveCodeRoom;
  socket: CodeRoomSocket;
};

export async function handleSocketDisconnect({
  db,
  io,
  socket,
}: HandleSocketDisconnectInput): Promise<void> {
  const roomId = socket.data.roomId;

  if (!roomId) {
    return;
  }

  const room = getActiveCodeRoom(roomId);

  if (!room) {
    return;
  }

  room.participants.delete(socket.id);
  logRealtimeInfo('code room participant disconnected', {
    participantCount: room.participants.size,
    roomId,
    socketId: socket.id,
    userId: socket.data.user?.id,
  });
  emitParticipantsChange(io, room);

  if (room.participants.size === 0) {
    await flushRoomSnapshotForSocket({ db, room, socket });
  }

  const removed = removeCodeRoomIfEmpty(room);

  if (removed) {
    logRealtimeInfo('code room cleaned up', { roomId });
  }
}

export async function flushRoomSnapshotForSocket({
  db,
  room,
  socket,
}: FlushRoomSnapshotForSocketInput): Promise<void> {
  const saved = await flushRoomSnapshot({ db, room });

  if (!saved) {
    logRealtimeWarning('code room snapshot save failed', {
      roomId: room.roomId,
      socketId: socket.id,
      userId: socket.data.user?.id,
    });
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not save the latest code room snapshot.');
  }
}
