import {
  VideoRoomErrorPayloadSchema,
  VideoRoomSocketEvent,
  type VideoRoomErrorCode,
} from '@ai-interview/shared';
import type { CodeRoomSocket } from '../types';

export function emitVideoRoomError(socket: CodeRoomSocket, code: VideoRoomErrorCode, message: string): void {
  socket.emit(VideoRoomSocketEvent.VideoRoomError, VideoRoomErrorPayloadSchema.parse({ code, message }));
}
