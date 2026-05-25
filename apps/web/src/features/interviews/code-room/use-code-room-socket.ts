'use client';

import {
  AwarenessUpdatePayloadSchema,
  CodeRoomSocketEvent,
  ParticipantsChangePayloadSchema,
  YjsSyncPayloadSchema,
  YjsUpdatePayloadSchema,
  type CodeEditorLanguage,
} from '@ai-interview/shared';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  type Awareness,
} from 'y-protocols/awareness.js';
import * as Y from 'yjs';
import { getRealtimeBaseUrl } from '@/lib/config';
import { getStoredApiAuthorizationToken } from '@/lib/api/client';
import type { CodeRoomParticipant, ConnectionState, SyncState } from './types';

type UseCodeRoomSocketOptions = {
  awareness: Awareness;
  doc: Y.Doc;
  interviewId: string;
  onLanguageChange: (language: CodeEditorLanguage) => void;
  questionId: string;
};

type CodeRoomJoinState = {
  interviewId: string;
  questionId: string;
};

const REMOTE_UPDATE_ORIGIN = 'remote';

export function useCodeRoomSocket(options: UseCodeRoomSocketOptions): {
  connectionState: ConnectionState;
  errorMessage: string | null;
  participants: CodeRoomParticipant[];
  syncState: SyncState;
} {
  const optionsRef = useRef(options);
  const joinStateRef = useRef<CodeRoomJoinState | null>(null);
  const [authToken] = useState(() => getStoredApiAuthorizationToken());
  const [connectionState, setConnectionState] = useState<ConnectionState>(authToken ? 'connecting' : 'disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(
    authToken ? null : 'Please sign in again to use the collaborative code room.',
  );
  const [participants, setParticipants] = useState<CodeRoomParticipant[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const socket = io(getRealtimeBaseUrl(), {
      auth: { token: authToken },
    });

    joinStateRef.current = {
      interviewId: options.interviewId,
      questionId: options.questionId,
    };

    function joinCurrentRoom(): void {
      if (!joinStateRef.current) {
        return;
      }

      socket.emit(CodeRoomSocketEvent.JoinCodeRoom, joinStateRef.current);
    }

    function publishAwarenessState(): void {
      const joinState = joinStateRef.current;
      const localState = optionsRef.current.awareness.getLocalState();

      if (!joinState || !localState) {
        return;
      }

      socket.emit(CodeRoomSocketEvent.AwarenessUpdate, {
        ...joinState,
        update: encodeAwarenessUpdate(optionsRef.current.awareness, [optionsRef.current.awareness.clientID]),
      });
    }

    function handleConnect(): void {
      setConnectionState('connected');
      setErrorMessage(null);
      joinCurrentRoom();
    }

    function handleDisconnect(): void {
      setConnectionState('disconnected');
    }

    function handleReconnectAttempt(): void {
      setConnectionState('reconnecting');
    }

    function handleReconnect(): void {
      setConnectionState('connected');
      joinCurrentRoom();
      publishAwarenessState();
    }

    function handleReconnectFailed(): void {
      setConnectionState('disconnected');
    }

    socket.on(CodeRoomSocketEvent.Connect, handleConnect);
    socket.on(CodeRoomSocketEvent.Disconnect, handleDisconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectAttempt, handleReconnectAttempt);
    socket.io.on(CodeRoomSocketEvent.Reconnect, handleReconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectFailed, handleReconnectFailed);

    socket.on(CodeRoomSocketEvent.ParticipantsChange, function handleParticipantsChange(rawPayload) {
      const payload = ParticipantsChangePayloadSchema.parse(rawPayload);
      setParticipants(payload.participants);
      publishAwarenessState();
    });

    socket.on(CodeRoomSocketEvent.YjsSync, function handleYjsSync(rawPayload) {
      const payload = YjsSyncPayloadSchema.parse(rawPayload);
      Y.applyUpdate(optionsRef.current.doc, new Uint8Array(payload.update), REMOTE_UPDATE_ORIGIN);
      optionsRef.current.onLanguageChange(payload.language);
      setSyncState('synced');
    });

    socket.on(CodeRoomSocketEvent.YjsUpdate, function handleYjsUpdate(rawPayload) {
      const payload = YjsUpdatePayloadSchema.parse(rawPayload);
      Y.applyUpdate(optionsRef.current.doc, new Uint8Array(payload.update), REMOTE_UPDATE_ORIGIN);
      setSyncState('synced');
    });

    socket.on(CodeRoomSocketEvent.AwarenessUpdate, function handleAwarenessUpdate(rawPayload) {
      const payload = AwarenessUpdatePayloadSchema.parse(rawPayload);
      applyAwarenessUpdate(optionsRef.current.awareness, new Uint8Array(payload.update), REMOTE_UPDATE_ORIGIN);
    });

    socket.on(CodeRoomSocketEvent.CodeRoomError, function handleCodeRoomError(payload: { message?: string }) {
      setErrorMessage(payload.message ?? 'The collaborative code room hit an unexpected error.');
    });

    function handleDocUpdate(update: Uint8Array, origin: unknown): void {
      if (origin === REMOTE_UPDATE_ORIGIN || !joinStateRef.current) {
        return;
      }

      setSyncState('syncing');
      socket.emit(CodeRoomSocketEvent.YjsUpdate, {
        ...joinStateRef.current,
        update,
      });
      setSyncState('synced');
    }

    function handleAwarenessLocalUpdate(
      changed: { added: number[]; removed: number[]; updated: number[] },
      origin: unknown,
    ): void {
      if (origin === REMOTE_UPDATE_ORIGIN || !joinStateRef.current) {
        return;
      }

      const changedClients = [...changed.added, ...changed.updated, ...changed.removed];
      socket.emit(CodeRoomSocketEvent.AwarenessUpdate, {
        ...joinStateRef.current,
        update: encodeAwarenessUpdate(optionsRef.current.awareness, changedClients),
      });
    }

    options.doc.on('update', handleDocUpdate);
    options.awareness.on('update', handleAwarenessLocalUpdate);

    return function cleanupCodeRoomSocket() {
      socket.off(CodeRoomSocketEvent.Connect, handleConnect);
      socket.off(CodeRoomSocketEvent.Disconnect, handleDisconnect);
      socket.off(CodeRoomSocketEvent.ParticipantsChange);
      socket.off(CodeRoomSocketEvent.YjsSync);
      socket.off(CodeRoomSocketEvent.YjsUpdate);
      socket.off(CodeRoomSocketEvent.AwarenessUpdate);
      socket.off(CodeRoomSocketEvent.CodeRoomError);
      socket.io.off(CodeRoomSocketEvent.ReconnectAttempt, handleReconnectAttempt);
      socket.io.off(CodeRoomSocketEvent.Reconnect, handleReconnect);
      socket.io.off(CodeRoomSocketEvent.ReconnectFailed, handleReconnectFailed);
      options.doc.off('update', handleDocUpdate);
      options.awareness.off('update', handleAwarenessLocalUpdate);
      options.awareness.setLocalState(null);
      socket.disconnect();
      joinStateRef.current = null;
    };
  }, [authToken, options.awareness, options.doc, options.interviewId, options.questionId]);

  return {
    connectionState,
    errorMessage,
    participants,
    syncState,
  };
}
