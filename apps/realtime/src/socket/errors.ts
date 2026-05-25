import {
  CodeRoomErrorPayloadSchema,
  CodeRoomSocketEvent,
  type CodeRoomErrorCode,
} from '@ai-interview/shared';
import type { CodeRoomSocket } from './types';

export function emitRoomError(socket: CodeRoomSocket, code: CodeRoomErrorCode, message: string): void {
  socket.emit(CodeRoomSocketEvent.CodeRoomError, CodeRoomErrorPayloadSchema.parse({ code, message }));
}
