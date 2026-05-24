import {
  AwarenessUpdatePayloadSchema,
  BroadcastAwarenessUpdatePayloadSchema,
  BroadcastYjsUpdatePayloadSchema,
  CodeRoomErrorPayloadSchema,
  createCodeRoomId,
  JoinCodeRoomPayloadSchema,
  ParticipantsChangePayloadSchema,
  YjsSyncPayloadSchema,
  YjsUpdatePayloadSchema,
  type CodeRoomErrorCode,
  type CodeRoomClientToServerEvents,
  type CodeRoomServerToClientEvents,
} from '@ai-interview/shared';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import * as Y from 'yjs';
import type { AuthenticatedUser } from './auth';
import { verifyAuthToken } from './auth';
import { canAccessCodeRoom, createRealtimeDb, findRealtimeUser } from './db';
import { getRealtimeConfig } from './env';
import {
  getActiveCodeRoom,
  getCodeRoomParticipants,
  getOrCreateCodeRoom,
  removeCodeRoomIfEmpty,
} from './rooms';

const config = getRealtimeConfig();
const db = config.databaseUrl ? createRealtimeDb(config.databaseUrl) : null;

type CodeRoomSocketData = {
  authorizedRoomIds?: Set<string>;
  roomId?: string;
  user?: AuthenticatedUser;
};

const server = createServer(function handleRequest(request, response) {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'ai-interview-realtime' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found.' }));
});

const io = new Server<
  CodeRoomClientToServerEvents,
  CodeRoomServerToClientEvents,
  Record<string, never>,
  CodeRoomSocketData
>(server, {
  cors: {
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
  },
});

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

io.on('connection', function handleConnection(socket) {
  socket.on('join-code-room', async function handleJoinCodeRoom(rawPayload) {
    const parsedPayload = JoinCodeRoomPayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      emitRoomError('INVALID_UPDATE', 'Invalid room join payload.');
      return;
    }

    const user = socket.data.user;

    if (!user || !db) {
      emitRoomError('UNAUTHORIZED', 'Please sign in again to join this code room.');
      return;
    }

    const { interviewId, questionId } = parsedPayload.data;
    const roomId = createCodeRoomId({ interviewId, questionId });
    const canAccessRoom = await checkCodeRoomAccess(interviewId, questionId, user.id);

    if (canAccessRoom === null) {
      emitRoomError('PERSISTENCE_FAILED', 'Could not verify code room access. Please try again.');
      return;
    }

    if (!canAccessRoom) {
      emitRoomError('FORBIDDEN', 'You do not have permission to join this code room.');
      return;
    }

    const room = getOrCreateCodeRoom(interviewId, questionId, roomId);

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.authorizedRoomIds?.add(roomId);

    room.participants.set(socket.id, {
      socketId: socket.id,
      userId: user.id,
      name: user.name,
      joinedAt: new Date().toISOString(),
    });

    socket.emit(
      'yjs-sync',
      YjsSyncPayloadSchema.parse({
        interviewId,
        questionId,
        update: Y.encodeStateAsUpdate(room.doc),
        language: room.language,
      }),
    );

    io.to(roomId).emit(
      'participants-change',
      ParticipantsChangePayloadSchema.parse({
        interviewId,
        questionId,
        participants: getCodeRoomParticipants(room),
      }),
    );
  });

  socket.on('yjs-update', function handleYjsUpdate(rawPayload) {
    const parsedPayload = YjsUpdatePayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      emitRoomError('INVALID_UPDATE', 'Invalid Yjs update payload.');
      return;
    }

    const { interviewId, questionId, update } = parsedPayload.data;
    const roomId = createCodeRoomId({ interviewId, questionId });
    const room = getActiveCodeRoom(roomId);

    if (!isAuthorizedForRoom(roomId)) {
      emitRoomError('FORBIDDEN', 'You do not have permission to edit this code room.');
      return;
    }

    if (!room) {
      emitRoomError('NOT_FOUND', 'Code room was not found.');
      return;
    }

    Y.applyUpdate(room.doc, update);

    socket.to(roomId).emit(
      'yjs-update',
      BroadcastYjsUpdatePayloadSchema.parse({
        interviewId,
        questionId,
        update,
        updatedBy: socket.id,
      }),
    );
  });

  socket.on('awareness-update', function handleAwarenessUpdate(rawPayload) {
    const parsedPayload = AwarenessUpdatePayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      emitRoomError('INVALID_UPDATE', 'Invalid awareness update payload.');
      return;
    }

    const { interviewId, questionId, update } = parsedPayload.data;
    const roomId = createCodeRoomId({ interviewId, questionId });
    const room = getActiveCodeRoom(roomId);

    if (!isAuthorizedForRoom(roomId)) {
      emitRoomError('FORBIDDEN', 'You do not have permission to update awareness for this code room.');
      return;
    }

    if (!room) {
      emitRoomError('NOT_FOUND', 'Code room was not found.');
      return;
    }

    socket.to(roomId).emit(
      'awareness-update',
      BroadcastAwarenessUpdatePayloadSchema.parse({
        interviewId,
        questionId,
        update,
        updatedBy: socket.id,
      }),
    );
  });

  socket.on('disconnect', function handleDisconnect() {
    const roomId = socket.data.roomId as string | undefined;

    if (!roomId) {
      return;
    }

    const room = getActiveCodeRoom(roomId);

    if (!room) {
      return;
    }

    room.participants.delete(socket.id);

    io.to(roomId).emit(
      'participants-change',
      ParticipantsChangePayloadSchema.parse({
        interviewId: room.interviewId,
        questionId: room.questionId,
        participants: getCodeRoomParticipants(room),
      }),
    );

    removeCodeRoomIfEmpty(room);
  });

  function isAuthorizedForRoom(roomId: string): boolean {
    return Boolean(socket.data.authorizedRoomIds?.has(roomId));
  }

  async function checkCodeRoomAccess(
    interviewId: string,
    questionId: string,
    userId: string,
  ): Promise<boolean | null> {
    if (!db) {
      return null;
    }

    try {
      return await canAccessCodeRoom(db, { interviewId, questionId, userId });
    } catch {
      return null;
    }
  }

  function emitRoomError(code: CodeRoomErrorCode, message: string): void {
    socket.emit('code-room-error', CodeRoomErrorPayloadSchema.parse({ code, message }));
  }
});

server.listen(config.port, function handleListen() {
  console.warn(`Realtime service listening on ${config.port}`);
});
