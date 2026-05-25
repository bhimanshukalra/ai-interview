import {
  CodeRoomSocketEvent,
  ParticipantsChangePayloadSchema,
} from '@ai-interview/shared';
import { getCodeRoomParticipants, type ActiveCodeRoom } from '../rooms';
import type { CodeRoomServer } from './types';

export function emitParticipantsChange(io: CodeRoomServer, room: ActiveCodeRoom): void {
  io.to(room.roomId).emit(
    CodeRoomSocketEvent.ParticipantsChange,
    ParticipantsChangePayloadSchema.parse({
      interviewId: room.interviewId,
      questionId: room.questionId,
      participants: getCodeRoomParticipants(room),
    }),
  );
}
