import {
  VideoParticipantsChangePayloadSchema,
  VideoRoomSocketEvent,
  VideoUserLeftPayloadSchema,
  type VideoParticipant,
} from '@ai-interview/shared';
import { logRealtimeInfo } from '../../logger';
import type { CodeRoomServer, CodeRoomSocket } from '../types';
import {
  getVideoRoom,
  getVideoRoomParticipants,
  removeVideoRoomIfEmpty,
  type ActiveVideoRoom,
} from './rooms';

export function emitVideoParticipantsChange(io: CodeRoomServer, room: ActiveVideoRoom): void {
  io.to(room.roomId).emit(
    VideoRoomSocketEvent.VideoParticipantsChange,
    VideoParticipantsChangePayloadSchema.parse({
      interviewId: room.interviewId,
      participants: getVideoRoomParticipants(room),
    }),
  );
}

export function removeSocketFromVideoRoom(io: CodeRoomServer, socket: CodeRoomSocket): VideoParticipant | null {
  const roomId = socket.data.videoRoomId;

  if (!roomId) {
    return null;
  }

  const room = getVideoRoom(roomId);
  socket.leave(roomId);
  socket.data.authorizedVideoRoomIds?.delete(roomId);
  socket.data.videoRoomId = undefined;

  if (!room) {
    return null;
  }

  const participant = room.participants.get(socket.id) ?? null;
  room.participants.delete(socket.id);

  if (participant) {
    socket.to(roomId).emit(
      VideoRoomSocketEvent.VideoUserLeft,
      VideoUserLeftPayloadSchema.parse({
        interviewId: room.interviewId,
        socketId: participant.socketId,
        userId: participant.userId,
      }),
    );
    logRealtimeInfo('video participant removed', {
      roomId,
      socketId: participant.socketId,
      userId: participant.userId,
    });
  }

  emitVideoParticipantsChange(io, room);

  if (removeVideoRoomIfEmpty(room)) {
    logRealtimeInfo('video room cleaned up', { roomId });
  }

  return participant;
}
