import type { RealtimeDatabase } from '../../db';
import {
  getActiveCodeRoom,
  removeCodeRoomIfEmpty,
  type ActiveCodeRoom,
} from '../../rooms';
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
  emitParticipantsChange(io, room);

  if (room.participants.size === 0) {
    await flushRoomSnapshotForSocket({ db, room, socket });
  }

  removeCodeRoomIfEmpty(room);
}

export async function flushRoomSnapshotForSocket({
  db,
  room,
  socket,
}: FlushRoomSnapshotForSocketInput): Promise<void> {
  const saved = await flushRoomSnapshot({ db, room });

  if (!saved) {
    emitRoomError(socket, 'PERSISTENCE_FAILED', 'Could not save the latest code room snapshot.');
  }
}
