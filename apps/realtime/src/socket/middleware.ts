import type { RealtimeDatabase } from '../db';
import { findRealtimeUser } from '../db';
import type { RealtimeConfig } from '../env';
import { verifyAuthToken } from '../auth';
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
      next(new Error('Realtime service is missing required auth configuration.'));
      return;
    }

    const token = typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : null;

    if (!token) {
      next(new Error('Authentication token is required.'));
      return;
    }

    const tokenUser = verifyAuthToken(token, config.jwtSecret);

    if (!tokenUser) {
      next(new Error('Authentication token is invalid or expired.'));
      return;
    }

    const user = await findRealtimeUser(db, tokenUser.id);

    if (!user) {
      next(new Error('Authenticated user was not found.'));
      return;
    }

    socket.data.authorizedRoomIds = new Set<string>();
    socket.data.user = user;
    next();
  });
}
