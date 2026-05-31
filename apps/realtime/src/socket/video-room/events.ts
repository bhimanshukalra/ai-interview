import { CodeRoomSocketEvent, VideoRoomSocketEvent } from '@ai-interview/shared';
import type { RealtimeDatabase } from '../../db';
import type { CodeRoomServer } from '../types';
import { removeSocketFromVideoRoom } from './participants';
import {
  handleJoinVideoRoom,
  handleLeaveVideoRoom,
  handleVideoAnswer,
  handleVideoIceCandidate,
  handleVideoMediaToggle,
  handleVideoOffer,
} from './handlers';

type RegisterVideoRoomEventsInput = {
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
};

export function registerVideoRoomEvents({ db, io }: RegisterVideoRoomEventsInput): void {
  io.on(CodeRoomSocketEvent.Connection, function handleConnection(socket) {
    socket.on(VideoRoomSocketEvent.JoinVideoRoom, function registerJoinVideoRoom(rawPayload) {
      void handleJoinVideoRoom({ db, io, rawPayload, socket });
    });

    socket.on(VideoRoomSocketEvent.LeaveVideoRoom, function registerLeaveVideoRoom(rawPayload) {
      handleLeaveVideoRoom({ db, io, rawPayload, socket });
    });

    socket.on(VideoRoomSocketEvent.VideoOffer, function registerVideoOffer(rawPayload) {
      handleVideoOffer({ rawPayload, socket });
    });

    socket.on(VideoRoomSocketEvent.VideoAnswer, function registerVideoAnswer(rawPayload) {
      handleVideoAnswer({ rawPayload, socket });
    });

    socket.on(VideoRoomSocketEvent.VideoIceCandidate, function registerVideoIceCandidate(rawPayload) {
      handleVideoIceCandidate({ rawPayload, socket });
    });

    socket.on(VideoRoomSocketEvent.VideoMediaToggle, function registerVideoMediaToggle(rawPayload) {
      handleVideoMediaToggle({ rawPayload, socket });
    });

    socket.on(CodeRoomSocketEvent.Disconnect, function registerDisconnect() {
      removeSocketFromVideoRoom(io, socket);
    });
  });
}
