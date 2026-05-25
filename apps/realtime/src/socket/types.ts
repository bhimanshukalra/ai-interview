import type {
  CodeRoomClientToServerEvents,
  CodeRoomServerToClientEvents,
} from '@ai-interview/shared';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../auth';

export type CodeRoomSocketData = {
  authorizedRoomIds?: Set<string>;
  roomId?: string;
  user?: AuthenticatedUser;
};

export type CodeRoomSocket = Socket<
  CodeRoomClientToServerEvents,
  CodeRoomServerToClientEvents,
  Record<string, never>,
  CodeRoomSocketData
>;

export type CodeRoomServer = Server<
  CodeRoomClientToServerEvents,
  CodeRoomServerToClientEvents,
  Record<string, never>,
  CodeRoomSocketData
>;
