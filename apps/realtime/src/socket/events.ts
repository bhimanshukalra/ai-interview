import { CodeRoomSocketEvent } from '@ai-interview/shared';
import type { RealtimeDatabase } from '../db';
import { handleAwarenessUpdate } from './handlers/awareness-update';
import { handleSocketDisconnect } from './handlers/disconnect';
import { handleJoinCodeRoom } from './handlers/join-code-room';
import { handleYjsUpdate } from './handlers/yjs-update';
import type { CodeRoomServer } from './types';

type RegisterCodeRoomEventsInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
};

export function registerCodeRoomEvents({ db, io }: RegisterCodeRoomEventsInput): void {
  io.on(CodeRoomSocketEvent.Connection, function handleConnection(socket) {
    socket.on(CodeRoomSocketEvent.JoinCodeRoom, function registerJoinCodeRoom(rawPayload) {
      void handleJoinCodeRoom({ db, io, rawPayload, socket });
    });

    socket.on(CodeRoomSocketEvent.YjsUpdate, function registerYjsUpdate(rawPayload) {
      handleYjsUpdate({ db, rawPayload, socket });
    });

    socket.on(CodeRoomSocketEvent.AwarenessUpdate, function registerAwarenessUpdate(rawPayload) {
      handleAwarenessUpdate({ rawPayload, socket });
    });

    socket.on(CodeRoomSocketEvent.Disconnect, function registerDisconnect() {
      void handleSocketDisconnect({ db, io, socket });
    });
  });
}
