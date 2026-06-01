import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import {
  createVideoRoomId,
  VideoRoomSocketEvent,
  type VideoRoomErrorPayload,
} from '@ai-interview/shared';
import type { RealtimeDatabase, VideoRoomAccess } from '../../db';
import type { CodeRoomServer, CodeRoomSocket } from '../types';
import {
  handleJoinVideoRoom,
  handleLeaveVideoRoom,
  handleVideoOffer,
} from './handlers';
import { removeSocketFromVideoRoom } from './participants';

type EmittedEvent = {
  event: string;
  payload: unknown;
  target?: string;
};

class MockSocket {
  data: CodeRoomSocket['data'];
  emitted: EmittedEvent[] = [];
  joinedRooms = new Set<string>();
  sentTo: EmittedEvent[] = [];

  constructor(
    readonly id: string,
    user: CodeRoomSocket['data']['user'] = {
      email: `${id}@example.com`,
      id: `user-${id}`,
      name: `User ${id}`,
    },
  ) {
    this.data = {
      authorizedVideoRoomIds: new Set<string>(),
      user,
    };
  }

  emit(event: string, payload: unknown): void {
    this.emitted.push({ event, payload });
  }

  join(roomId: string): void {
    this.joinedRooms.add(roomId);
  }

  leave(roomId: string): void {
    this.joinedRooms.delete(roomId);
  }

  to(target: string): { emit: (event: string, payload: unknown) => void } {
    return {
      emit: (event, payload) => {
        this.sentTo.push({ event, payload, target });
      },
    };
  }
}

class MockServer {
  emitted: EmittedEvent[] = [];

  to(target: string): { emit: (event: string, payload: unknown) => void } {
    return {
      emit: (event, payload) => {
        this.emitted.push({ event, payload, target });
      },
    };
  }
}

describe('video room handlers', () => {
  let io: MockServer;

  beforeEach(() => {
    io = new MockServer();
  });

  test('authorizes a user before joining a video room', async () => {
    const socket = new MockSocket('socket-authorized');
    const interviewId = 'interview-authorized';
    const roomId = createVideoRoomId({ interviewId });

    await joinVideoRoom({
      access: { role: 'candidate' },
      interviewId,
      io,
      socket,
    });

    assert.equal(socket.joinedRooms.has(roomId), true);
    assert.equal(socket.data.videoRoomId, roomId);
    assert.equal(socket.data.authorizedVideoRoomIds?.has(roomId), true);
    assert.equal(socket.emitted[0]?.event, VideoRoomSocketEvent.VideoRoomJoined);
  });

  test('rejects unauthorized video room joins', async () => {
    const socket = new MockSocket('socket-forbidden');

    await joinVideoRoom({
      access: null,
      interviewId: 'interview-forbidden',
      io,
      socket,
    });

    assert.equal(socket.joinedRooms.size, 0);
    assertVideoRoomError(socket, 'FORBIDDEN');
  });

  test('rejects malformed join payloads', async () => {
    const socket = new MockSocket('socket-invalid');

    await handleJoinVideoRoom({
      canAccessVideoRoom: async () => ({ role: 'candidate' }),
      db: {} as RealtimeDatabase,
      io: io as unknown as CodeRoomServer,
      rawPayload: {},
      socket: socket as unknown as CodeRoomSocket,
    });

    assert.equal(socket.joinedRooms.size, 0);
    assertVideoRoomError(socket, 'INVALID_SIGNAL');
  });

  test('rejects signaling to sockets outside the room', async () => {
    const socket = new MockSocket('socket-sender');
    const interviewId = 'interview-missing-target';

    await joinVideoRoom({
      access: { role: 'candidate' },
      interviewId,
      io,
      socket,
    });
    socket.sentTo = [];

    handleVideoOffer({
      rawPayload: {
        interviewId,
        offer: { sdp: 'offer', type: 'offer' },
        targetSocketId: 'socket-not-in-room',
      },
      socket: socket as unknown as CodeRoomSocket,
    });

    assert.equal(socket.sentTo.length, 0);
    assertVideoRoomError(socket, 'FORBIDDEN');
  });

  test('forwards video offers between authorized room participants', async () => {
    const sender = new MockSocket('socket-offer-sender');
    const target = new MockSocket('socket-offer-target');
    const interviewId = 'interview-forward-offer';

    await joinVideoRoom({ access: { role: 'candidate' }, interviewId, io, socket: sender });
    await joinVideoRoom({ access: { role: 'interviewer' }, interviewId, io, socket: target });

    handleVideoOffer({
      rawPayload: {
        interviewId,
        offer: { sdp: 'offer', type: 'offer' },
        targetSocketId: target.id,
      },
      socket: sender as unknown as CodeRoomSocket,
    });

    assert.deepEqual(sender.sentTo.at(-1), {
      event: VideoRoomSocketEvent.VideoOffer,
      payload: {
        fromSocketId: sender.id,
        interviewId,
        offer: { sdp: 'offer', type: 'offer' },
      },
      target: target.id,
    });
  });

  test('removes participants and notifies peers on leave', async () => {
    const remainingSocket = new MockSocket('socket-remaining');
    const leavingSocket = new MockSocket('socket-leaving');
    const interviewId = 'interview-leave';
    const roomId = createVideoRoomId({ interviewId });

    await joinVideoRoom({ access: { role: 'candidate' }, interviewId, io, socket: remainingSocket });
    await joinVideoRoom({ access: { role: 'interviewer' }, interviewId, io, socket: leavingSocket });

    handleLeaveVideoRoom({
      db: null,
      io: io as unknown as CodeRoomServer,
      rawPayload: { interviewId },
      socket: leavingSocket as unknown as CodeRoomSocket,
    });

    assert.equal(leavingSocket.joinedRooms.has(roomId), false);
    assert.equal(leavingSocket.data.videoRoomId, undefined);
    assert.equal(leavingSocket.data.authorizedVideoRoomIds?.has(roomId), false);
    assert.deepEqual(leavingSocket.sentTo.at(-1), {
      event: VideoRoomSocketEvent.VideoUserLeft,
      payload: {
        interviewId,
        socketId: leavingSocket.id,
        userId: leavingSocket.data.user?.id,
      },
      target: roomId,
    });
  });

  test('removes participants on disconnect cleanup', async () => {
    const socket = new MockSocket('socket-disconnect');
    const interviewId = 'interview-disconnect';
    const roomId = createVideoRoomId({ interviewId });

    await joinVideoRoom({ access: { role: 'candidate' }, interviewId, io, socket });
    removeSocketFromVideoRoom(io as unknown as CodeRoomServer, socket as unknown as CodeRoomSocket);

    assert.equal(socket.joinedRooms.has(roomId), false);
    assert.equal(socket.data.videoRoomId, undefined);
    assert.equal(socket.data.authorizedVideoRoomIds?.has(roomId), false);
  });
});

async function joinVideoRoom(input: {
  access: VideoRoomAccess | null;
  interviewId: string;
  io: MockServer;
  socket: MockSocket;
}): Promise<void> {
  await handleJoinVideoRoom({
    canAccessVideoRoom: async () => input.access,
    db: {} as RealtimeDatabase,
    io: input.io as unknown as CodeRoomServer,
    rawPayload: { interviewId: input.interviewId },
    socket: input.socket as unknown as CodeRoomSocket,
  });
}

function assertVideoRoomError(socket: MockSocket, code: VideoRoomErrorPayload['code']): void {
  const errorEvent = socket.emitted.find((event) => event.event === VideoRoomSocketEvent.VideoRoomError);

  assert.ok(errorEvent);
  assert.equal((errorEvent.payload as VideoRoomErrorPayload).code, code);
}
