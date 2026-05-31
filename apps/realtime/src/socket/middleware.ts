import type { RealtimeDatabase } from '../db';
import { findRealtimeUser } from '../db';
import type { RealtimeConfig } from '../env';
import { verifyAuthToken } from '../auth';
import { logRealtimeWarning } from '../logger';
import type { CodeRoomServer } from './types';

type RegisterSocketAuthMiddlewareInput = {
  config: RealtimeConfig;
  db: RealtimeDatabase | null;
  io: CodeRoomServer;
};

export function registerSocketAuthMiddleware({
  config,
  db,
  io,
}: RegisterSocketAuthMiddlewareInput): void {
  io.use(async function authenticateSocket(socket, next) {
    if (!config.jwtSecret || !db) {
      logRealtimeWarning('socket auth failed: missing service configuration', { socketId: socket.id });
      next(new Error('Realtime service is missing required auth configuration.'));
      return;
    }

    const token = typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : null;

    if (!token) {
      logRealtimeWarning('socket auth failed: missing token', { socketId: socket.id });
      next(new Error('Authentication token is required.'));
      return;
    }

    const tokenUser = verifyAuthToken(token, config.jwtSecret);

    if (!tokenUser) {
      logRealtimeWarning('socket auth failed: invalid token', { socketId: socket.id });
      next(new Error('Authentication token is invalid or expired.'));
      return;
    }

    let user: Awaited<ReturnType<typeof findRealtimeUser>>;

    try {
      user = await findRealtimeUser(db, tokenUser.id);
    } catch (error) {
      logRealtimeWarning('socket auth failed: user lookup error', {
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id,
        userId: tokenUser.id,
      });
      next(new Error('Could not verify realtime user.'));
      return;
    }

    if (!user) {
      logRealtimeWarning('socket auth failed: user not found', { socketId: socket.id, userId: tokenUser.id });
      next(new Error('Authenticated user was not found.'));
      return;
    }

    socket.data.authorizedRoomIds = new Set<string>();
    socket.data.authorizedVideoRoomIds = new Set<string>();
    socket.data.editableRoomIds = new Set<string>();
    socket.data.user = user;
    next();
  });
}
