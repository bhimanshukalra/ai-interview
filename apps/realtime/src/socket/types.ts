import type {
  CodeRoomClientToServerEvents,
  CodeRoomServerToClientEvents,
  VideoRoomClientToServerEvents,
  VideoRoomServerToClientEvents,
} from '@ai-interview/shared';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../auth';

export type CodeRoomSocketData = {
  authorizedRoomIds?: Set<string>;
  authorizedVideoRoomIds?: Set<string>;
  editableRoomIds?: Set<string>;
  roomId?: string;
  user?: AuthenticatedUser;
  videoRoomId?: string;
};

type RealtimeClientToServerEvents = CodeRoomClientToServerEvents & VideoRoomClientToServerEvents;
type RealtimeServerToClientEvents = CodeRoomServerToClientEvents & VideoRoomServerToClientEvents;

export type CodeRoomSocket = Socket<
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
  Record<string, never>,
  CodeRoomSocketData
>;

export type CodeRoomServer = Server<
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
  Record<string, never>,
  CodeRoomSocketData
>;
