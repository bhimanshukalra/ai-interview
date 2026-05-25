import type { CodeRoomAccess, CodeRoomParticipant } from '@ai-interview/shared';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type SyncState = 'idle' | 'syncing' | 'synced';

export type { CodeRoomAccess, CodeRoomParticipant };
