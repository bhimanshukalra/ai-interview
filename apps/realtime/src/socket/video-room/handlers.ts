import {
  BroadcastVideoAnswerPayloadSchema,
  BroadcastVideoIceCandidatePayloadSchema,
  BroadcastVideoMediaTogglePayloadSchema,
  BroadcastVideoOfferPayloadSchema,
  createVideoRoomId,
  JoinVideoRoomPayloadSchema,
  LeaveVideoRoomPayloadSchema,
  VideoAnswerPayloadSchema,
  VideoIceCandidatePayloadSchema,
  VideoMediaTogglePayloadSchema,
  VideoOfferPayloadSchema,
  VideoRoomJoinedPayloadSchema,
  VideoRoomSocketEvent,
  VideoUserJoinedPayloadSchema,
} from '@ai-interview/shared';
import { canAccessVideoRoom, type RealtimeDatabase } from '../../db';
import { logRealtimeInfo, logRealtimeWarning } from '../../logger';
import type { CodeRoomServer, CodeRoomSocket } from '../types';
import { emitVideoRoomError } from './errors';
import { emitVideoParticipantsChange, removeSocketFromVideoRoom } from './participants';
import { getOrCreateVideoRoom, getVideoRoom, getVideoRoomParticipants } from './rooms';

type VideoRoomHandlerInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

type VideoSignalInput = {
  rawPayload: unknown;
  socket: CodeRoomSocket;
};

export async function handleJoinVideoRoom({ db, io, rawPayload, socket }: VideoRoomHandlerInput): Promise<void> {
  const parsedPayload = JoinVideoRoomPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video room join payload.');
    return;
  }

  const user = socket.data.user;

  if (!user || !db) {
    emitVideoRoomError(socket, 'UNAUTHORIZED', 'Please sign in again to join this video room.');
    return;
  }

  const { interviewId } = parsedPayload.data;
  const access = await canAccessVideoRoom(db, { interviewId, userId: user.id });

  if (!access) {
    logRealtimeWarning('video room join rejected: forbidden', {
      interviewId,
      socketId: socket.id,
      userId: user.id,
    });
    emitVideoRoomError(socket, 'FORBIDDEN', 'You do not have permission to join this video room.');
    return;
  }

  const roomId = createVideoRoomId({ interviewId });
  removeSocketFromVideoRoom(io, socket);

  const room = getOrCreateVideoRoom({ interviewId, roomId });
  const participant = {
    audioEnabled: true,
    joinedAt: new Date().toISOString(),
    name: user.name,
    role: access.role,
    socketId: socket.id,
    userId: user.id,
    videoEnabled: true,
  };

  socket.join(roomId);
  socket.data.authorizedVideoRoomIds?.add(roomId);
  socket.data.videoRoomId = roomId;
  room.participants.set(socket.id, participant);

  socket.emit(
    VideoRoomSocketEvent.VideoRoomJoined,
    VideoRoomJoinedPayloadSchema.parse({
      interviewId,
      participant,
      participants: getVideoRoomParticipants(room),
      roomId,
    }),
  );
  socket.to(roomId).emit(
    VideoRoomSocketEvent.VideoUserJoined,
    VideoUserJoinedPayloadSchema.parse({ interviewId, participant }),
  );
  emitVideoParticipantsChange(io, room);

  logRealtimeInfo('video room joined', {
    participantCount: room.participants.size,
    role: access.role,
    roomId,
    socketId: socket.id,
    userId: user.id,
  });
}

export function handleLeaveVideoRoom({ io, rawPayload, socket }: VideoRoomHandlerInput): void {
  const parsedPayload = LeaveVideoRoomPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video room leave payload.');
    return;
  }

  const participant = removeSocketFromVideoRoom(io, socket);

  if (participant) {
    logRealtimeInfo('video room left', {
      socketId: socket.id,
      userId: participant.userId,
    });
  }
}

export function handleVideoOffer({ rawPayload, socket }: VideoSignalInput): void {
  const parsedPayload = VideoOfferPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video offer payload.');
    return;
  }

  const { interviewId, offer, targetSocketId } = parsedPayload.data;
  const roomId = createVideoRoomId({ interviewId });

  if (!canSignalVideoPeer(socket, roomId, targetSocketId)) {
    emitVideoRoomError(socket, 'FORBIDDEN', 'You cannot signal that video room participant.');
    return;
  }

  socket.to(targetSocketId).emit(
    VideoRoomSocketEvent.VideoOffer,
    BroadcastVideoOfferPayloadSchema.parse({
      fromSocketId: socket.id,
      interviewId,
      offer,
    }),
  );
  logForwardedVideoSignal('video-offer', { roomId, socket, targetSocketId });
}

export function handleVideoAnswer({ rawPayload, socket }: VideoSignalInput): void {
  const parsedPayload = VideoAnswerPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video answer payload.');
    return;
  }

  const { answer, interviewId, targetSocketId } = parsedPayload.data;
  const roomId = createVideoRoomId({ interviewId });

  if (!canSignalVideoPeer(socket, roomId, targetSocketId)) {
    emitVideoRoomError(socket, 'FORBIDDEN', 'You cannot signal that video room participant.');
    return;
  }

  socket.to(targetSocketId).emit(
    VideoRoomSocketEvent.VideoAnswer,
    BroadcastVideoAnswerPayloadSchema.parse({
      answer,
      fromSocketId: socket.id,
      interviewId,
    }),
  );
  logForwardedVideoSignal('video-answer', { roomId, socket, targetSocketId });
}

export function handleVideoIceCandidate({ rawPayload, socket }: VideoSignalInput): void {
  const parsedPayload = VideoIceCandidatePayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video ICE candidate payload.');
    return;
  }

  const { candidate, interviewId, targetSocketId } = parsedPayload.data;
  const roomId = createVideoRoomId({ interviewId });

  if (!canSignalVideoPeer(socket, roomId, targetSocketId)) {
    emitVideoRoomError(socket, 'FORBIDDEN', 'You cannot signal that video room participant.');
    return;
  }

  socket.to(targetSocketId).emit(
    VideoRoomSocketEvent.VideoIceCandidate,
    BroadcastVideoIceCandidatePayloadSchema.parse({
      candidate,
      fromSocketId: socket.id,
      interviewId,
    }),
  );
  logForwardedVideoSignal('video-ice-candidate', { roomId, socket, targetSocketId });
}

export function handleVideoMediaToggle({ rawPayload, socket }: VideoSignalInput): void {
  const parsedPayload = VideoMediaTogglePayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    emitVideoRoomError(socket, 'INVALID_SIGNAL', 'Invalid video media toggle payload.');
    return;
  }

  const { enabled, interviewId, kind } = parsedPayload.data;
  const roomId = createVideoRoomId({ interviewId });
  const room = getVideoRoom(roomId);
  const participant = room?.participants.get(socket.id);

  if (!room || !participant || !socket.data.authorizedVideoRoomIds?.has(roomId)) {
    logRealtimeWarning('video media toggle rejected: unauthorized room', {
      kind,
      roomId,
      socketId: socket.id,
      userId: socket.data.user?.id,
    });
    emitVideoRoomError(socket, 'FORBIDDEN', 'You cannot update media state for this video room.');
    return;
  }

  room.participants.set(socket.id, {
    ...participant,
    audioEnabled: kind === 'audio' ? enabled : participant.audioEnabled,
    videoEnabled: kind === 'video' ? enabled : participant.videoEnabled,
  });

  socket.to(roomId).emit(
    VideoRoomSocketEvent.VideoMediaToggle,
    BroadcastVideoMediaTogglePayloadSchema.parse({
      enabled,
      fromSocketId: socket.id,
      interviewId,
      kind,
    }),
  );
  logRealtimeInfo('video media state updated', {
    enabled,
    kind,
    roomId,
    socketId: socket.id,
    userId: participant.userId,
  });
}

function canSignalVideoPeer(socket: CodeRoomSocket, roomId: string, targetSocketId: string): boolean {
  const room = getVideoRoom(roomId);

  if (!room || !socket.data.authorizedVideoRoomIds?.has(roomId)) {
    logRealtimeWarning('video signaling rejected: unauthorized room', {
      roomId,
      socketId: socket.id,
      targetSocketId,
      userId: socket.data.user?.id,
    });
    return false;
  }

  if (!room.participants.has(socket.id) || !room.participants.has(targetSocketId)) {
    logRealtimeWarning('video signaling rejected: target not in room', {
      roomId,
      socketId: socket.id,
      targetSocketId,
      userId: socket.data.user?.id,
    });
    return false;
  }

  return true;
}

function logForwardedVideoSignal(
  eventName: 'video-answer' | 'video-ice-candidate' | 'video-offer',
  {
    roomId,
    socket,
    targetSocketId,
  }: {
    roomId: string;
    socket: CodeRoomSocket;
    targetSocketId: string;
  },
): void {
  logRealtimeInfo('video signaling forwarded', {
    eventName,
    roomId,
    socketId: socket.id,
    targetSocketId,
    userId: socket.data.user?.id,
  });
}
