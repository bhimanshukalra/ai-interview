import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createRealtimeDb } from './db';
import { getRealtimeConfig } from './env';
import { registerCodeRoomEvents } from './socket/events';
import { registerSocketAuthMiddleware } from './socket/middleware';
import { registerVideoRoomEvents } from './socket/video-room/events';
import type { CodeRoomServer } from './socket/types';

const config = getRealtimeConfig();
const db = config.databaseUrl ? createRealtimeDb(config.databaseUrl) : null;

const server = createServer(function handleRequest(request, response) {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'ai-interview-realtime' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found.' }));
});

const io: CodeRoomServer = new Server(server, {
  cors: {
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
  },
});

registerSocketAuthMiddleware({ config, db, io });
registerCodeRoomEvents({ db, io });
registerVideoRoomEvents({ db, io });

server.listen(config.port, function handleListen() {
  console.warn(`Realtime service listening on ${config.port}`);
});
