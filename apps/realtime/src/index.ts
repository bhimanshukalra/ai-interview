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
  type CodeRoomClientToServerEvents,
  type CodeRoomServerToClientEvents,
} from '@ai-interview/shared';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import * as Y from 'yjs';
import { getRealtimeConfig } from './env';
import {
  getActiveCodeRoom,
  getCodeRoomParticipants,
  getOrCreateCodeRoom,
  removeCodeRoomIfEmpty,
} from './rooms';

const config = getRealtimeConfig();

const server = createServer(function handleRequest(request, response) {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'ai-interview-realtime' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found.' }));
});

const io = new Server<CodeRoomClientToServerEvents, CodeRoomServerToClientEvents>(server, {
  cors: {
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', function handleConnection(socket) {
  socket.on('join-code-room', function handleJoinCodeRoom(rawPayload) {
    const parsedPayload = JoinCodeRoomPayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      emitRoomError('INVALID_UPDATE', 'Invalid room join payload.');
      return;
    }

    const { interviewId, questionId } = parsedPayload.data;
    const roomId = createCodeRoomId({ interviewId, questionId });
    const room = getOrCreateCodeRoom(interviewId, questionId, roomId);

    socket.join(roomId);
    socket.data.roomId = roomId;

    room.participants.set(socket.id, {
      socketId: socket.id,
      userId: socket.id,
      name: `Guest ${socket.id.slice(0, 5)}`,
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

  function emitRoomError(code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_UPDATE' | 'PERSISTENCE_FAILED', message: string): void {
    socket.emit('code-room-error', CodeRoomErrorPayloadSchema.parse({ code, message }));
  }
});

server.listen(config.port, function handleListen() {
  console.warn(`Realtime service listening on ${config.port}`);
});
