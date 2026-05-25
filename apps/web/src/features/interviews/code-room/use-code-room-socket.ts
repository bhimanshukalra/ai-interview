'use client';

import {
  AwarenessUpdatePayloadSchema,
  CodeRoomErrorPayloadSchema,
  CodeRoomSocketEvent,
  LanguageChangePayloadSchema,
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
import type { CodeRoomAccess, CodeRoomParticipant, ConnectionState, SyncState } from './types';

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
  access: CodeRoomAccess | null;
  connectionState: ConnectionState;
  errorMessage: string | null;
  participants: CodeRoomParticipant[];
  syncState: SyncState;
  updateLanguage: (language: CodeEditorLanguage) => void;
} {
  const optionsRef = useRef(options);
  const joinStateRef = useRef<CodeRoomJoinState | null>(null);
  const languageUpdateRef = useRef<((language: CodeEditorLanguage) => void) | null>(null);
  const [authToken] = useState(() => getStoredApiAuthorizationToken());
  const [connectionState, setConnectionState] = useState<ConnectionState>(authToken ? 'connecting' : 'disconnected');
  const [access, setAccess] = useState<CodeRoomAccess | null>(null);
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
      setErrorMessage('Could not reconnect to the collaborative code room. Your written answer is still safe.');
    }

    function handleConnectError(error: Error): void {
      setConnectionState('disconnected');
      setErrorMessage(error.message || 'Could not connect to the collaborative code room.');
    }

    function handleInvalidRealtimePayload(): void {
      setSyncState('idle');
      setErrorMessage('The collaborative code room received invalid realtime data. Your written answer is still safe.');
    }

    socket.on(CodeRoomSocketEvent.Connect, handleConnect);
    socket.on(CodeRoomSocketEvent.ConnectError, handleConnectError);
    socket.on(CodeRoomSocketEvent.Disconnect, handleDisconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectAttempt, handleReconnectAttempt);
    socket.io.on(CodeRoomSocketEvent.Reconnect, handleReconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectFailed, handleReconnectFailed);

    socket.on(CodeRoomSocketEvent.ParticipantsChange, function handleParticipantsChange(rawPayload) {
      const parsedPayload = ParticipantsChangePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidRealtimePayload();
        return;
      }

      const payload = parsedPayload.data;
      setParticipants(payload.participants);
      publishAwarenessState();
    });

    socket.on(CodeRoomSocketEvent.LanguageChange, function handleLanguageChange(rawPayload) {
      const parsedPayload = LanguageChangePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidRealtimePayload();
        return;
      }

      optionsRef.current.onLanguageChange(parsedPayload.data.language);
    });

    socket.on(CodeRoomSocketEvent.YjsSync, function handleYjsSync(rawPayload) {
      const parsedPayload = YjsSyncPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidRealtimePayload();
        return;
      }

      const payload = parsedPayload.data;

      try {
        Y.applyUpdate(optionsRef.current.doc, new Uint8Array(payload.update), REMOTE_UPDATE_ORIGIN);
      } catch {
        handleInvalidRealtimePayload();
        return;
      }

      optionsRef.current.onLanguageChange(payload.language);
      setAccess(payload.access);
      setSyncState('synced');
    });

    socket.on(CodeRoomSocketEvent.YjsUpdate, function handleYjsUpdate(rawPayload) {
      const parsedPayload = YjsUpdatePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidRealtimePayload();
        return;
      }

      const payload = parsedPayload.data;

      try {
        Y.applyUpdate(optionsRef.current.doc, new Uint8Array(payload.update), REMOTE_UPDATE_ORIGIN);
      } catch {
        handleInvalidRealtimePayload();
        return;
      }

      setSyncState('synced');
    });

    socket.on(CodeRoomSocketEvent.AwarenessUpdate, function handleAwarenessUpdate(rawPayload) {
      const parsedPayload = AwarenessUpdatePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidRealtimePayload();
        return;
      }

      try {
        applyAwarenessUpdate(
          optionsRef.current.awareness,
          new Uint8Array(parsedPayload.data.update),
          REMOTE_UPDATE_ORIGIN,
        );
      } catch {
        handleInvalidRealtimePayload();
      }
    });

    socket.on(CodeRoomSocketEvent.CodeRoomError, function handleCodeRoomError(rawPayload) {
      const parsedPayload = CodeRoomErrorPayloadSchema.safeParse(rawPayload);
      setErrorMessage(
        parsedPayload.success
          ? parsedPayload.data.message
          : 'The collaborative code room hit an unexpected error.',
      );
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

    function updateLanguage(language: CodeEditorLanguage): void {
      if (!joinStateRef.current) {
        return;
      }

      socket.emit(CodeRoomSocketEvent.LanguageChange, {
        ...joinStateRef.current,
        language,
      });
    }

    languageUpdateRef.current = updateLanguage;

    return function cleanupCodeRoomSocket() {
      socket.off(CodeRoomSocketEvent.Connect, handleConnect);
      socket.off(CodeRoomSocketEvent.ConnectError, handleConnectError);
      socket.off(CodeRoomSocketEvent.Disconnect, handleDisconnect);
      socket.off(CodeRoomSocketEvent.ParticipantsChange);
      socket.off(CodeRoomSocketEvent.LanguageChange);
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
      languageUpdateRef.current = null;
      joinStateRef.current = null;
    };
  }, [authToken, options.awareness, options.doc, options.interviewId, options.questionId]);

  function updateRoomLanguage(language: CodeEditorLanguage): void {
    languageUpdateRef.current?.(language);
  }

  return {
    connectionState,
    access,
    errorMessage,
    participants,
    syncState,
    updateLanguage: updateRoomLanguage,
  };
}
