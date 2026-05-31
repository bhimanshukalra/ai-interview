import type { VideoParticipant } from '@ai-interview/shared';

export type ActiveVideoRoom = {
  interviewId: string;
  participants: Map<string, VideoParticipant>;
  roomId: string;
};

const videoRooms = new Map<string, ActiveVideoRoom>();

export function getOrCreateVideoRoom(input: { interviewId: string; roomId: string }): ActiveVideoRoom {
  const existingRoom = videoRooms.get(input.roomId);

  if (existingRoom) {
    return existingRoom;
  }

  const room: ActiveVideoRoom = {
    interviewId: input.interviewId,
    participants: new Map<string, VideoParticipant>(),
    roomId: input.roomId,
  };

  videoRooms.set(input.roomId, room);

  return room;
}

export function getVideoRoom(roomId: string): ActiveVideoRoom | null {
  return videoRooms.get(roomId) ?? null;
}

export function getVideoRoomParticipants(room: ActiveVideoRoom): VideoParticipant[] {
  return Array.from(room.participants.values());
}

export function removeVideoRoomIfEmpty(room: ActiveVideoRoom): boolean {
  if (room.participants.size > 0) {
    return false;
  }

  videoRooms.delete(room.roomId);
  return true;
}
