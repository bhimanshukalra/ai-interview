'use client';

import {
  BroadcastVideoAnswerPayloadSchema,
  BroadcastVideoIceCandidatePayloadSchema,
  BroadcastVideoMediaTogglePayloadSchema,
  BroadcastVideoOfferPayloadSchema,
  CodeRoomSocketEvent,
  VideoParticipantsChangePayloadSchema,
  VideoRoomErrorPayloadSchema,
  VideoRoomJoinedPayloadSchema,
  VideoRoomSocketEvent,
  VideoUserJoinedPayloadSchema,
  VideoUserLeftPayloadSchema,
  type RtcIceCandidate,
  type RtcSessionDescription,
  type VideoParticipant,
} from '@ai-interview/shared';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getStoredApiAuthorizationToken } from '@/lib/api/client';
import { getRealtimeBaseUrl } from '@/lib/config';

type SignalingState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type UseVideoRoomSocketOptions = {
  enabled: boolean;
  interviewId: string;
  onAnswer: (payload: { answer: RtcSessionDescription; fromSocketId: string }) => void;
  onIceCandidate: (payload: { candidate: RtcIceCandidate; fromSocketId: string }) => void;
  onOffer: (payload: { fromSocketId: string; offer: RtcSessionDescription }) => void;
  onUserJoined: (participant: VideoParticipant) => void;
  onUserLeft: (participant: { socketId: string; userId: string }) => void;
};

type SendVideoSignal = {
  leaveVideoRoom: () => void;
  sendAnswer: (targetSocketId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (targetSocketId: string, candidate: RTCIceCandidateInit) => void;
  sendMediaToggle: (kind: 'audio' | 'video', enabled: boolean) => void;
  sendOffer: (targetSocketId: string, offer: RTCSessionDescriptionInit) => void;
};

export function useVideoRoomSocket(options: UseVideoRoomSocketOptions): {
  errorMessage: string | null;
  participants: VideoParticipant[];
  selfParticipant: VideoParticipant | null;
  signalingState: SignalingState;
} & SendVideoSignal {
  const optionsRef = useRef(options);
  const signalRef = useRef<SendVideoSignal | null>(null);
  const [authToken] = useState(() => getStoredApiAuthorizationToken());
  const [errorMessage, setErrorMessage] = useState<string | null>(
    authToken ? null : 'Please sign in again to join the video room.',
  );
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [selfParticipant, setSelfParticipant] = useState<VideoParticipant | null>(null);
  const [signalingState, setSignalingState] = useState<SignalingState>(
    authToken && options.enabled ? 'connecting' : 'disconnected',
  );

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!options.enabled || !authToken) {
      return;
    }

    const socket = io(getRealtimeBaseUrl(), {
      auth: { token: authToken },
    });

    function joinVideoRoom(): void {
      socket.emit(VideoRoomSocketEvent.JoinVideoRoom, { interviewId: options.interviewId });
    }

    function handleInvalidPayload(): void {
      setErrorMessage('The video room received invalid signaling data.');
    }

    function handleConnect(): void {
      setSignalingState('connected');
      setErrorMessage(null);
      joinVideoRoom();
    }

    function handleDisconnect(): void {
      setSignalingState('disconnected');
    }

    function handleReconnectAttempt(): void {
      setSignalingState('reconnecting');
    }

    function handleReconnect(): void {
      setSignalingState('connected');
      joinVideoRoom();
    }

    function handleReconnectFailed(): void {
      setSignalingState('disconnected');
      setErrorMessage('Could not reconnect to the video room.');
    }

    function handleConnectError(error: Error): void {
      setSignalingState('disconnected');
      setErrorMessage(error.message || 'Could not connect to the video room.');
    }

    socket.on(CodeRoomSocketEvent.Connect, handleConnect);
    socket.on(CodeRoomSocketEvent.ConnectError, handleConnectError);
    socket.on(CodeRoomSocketEvent.Disconnect, handleDisconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectAttempt, handleReconnectAttempt);
    socket.io.on(CodeRoomSocketEvent.Reconnect, handleReconnect);
    socket.io.on(CodeRoomSocketEvent.ReconnectFailed, handleReconnectFailed);

    socket.on(VideoRoomSocketEvent.VideoRoomJoined, function handleVideoRoomJoined(rawPayload) {
      const parsedPayload = VideoRoomJoinedPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      setSelfParticipant(parsedPayload.data.participant);
      setParticipants(parsedPayload.data.participants);
    });

    socket.on(VideoRoomSocketEvent.VideoParticipantsChange, function handleVideoParticipantsChange(rawPayload) {
      const parsedPayload = VideoParticipantsChangePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      setParticipants(parsedPayload.data.participants);
    });

    socket.on(VideoRoomSocketEvent.VideoUserJoined, function handleVideoUserJoined(rawPayload) {
      const parsedPayload = VideoUserJoinedPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      optionsRef.current.onUserJoined(parsedPayload.data.participant);
    });

    socket.on(VideoRoomSocketEvent.VideoUserLeft, function handleVideoUserLeft(rawPayload) {
      const parsedPayload = VideoUserLeftPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      optionsRef.current.onUserLeft(parsedPayload.data);
    });

    socket.on(VideoRoomSocketEvent.VideoOffer, function handleVideoOffer(rawPayload) {
      const parsedPayload = BroadcastVideoOfferPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      optionsRef.current.onOffer(parsedPayload.data);
    });

    socket.on(VideoRoomSocketEvent.VideoAnswer, function handleVideoAnswer(rawPayload) {
      const parsedPayload = BroadcastVideoAnswerPayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      optionsRef.current.onAnswer(parsedPayload.data);
    });

    socket.on(VideoRoomSocketEvent.VideoIceCandidate, function handleVideoIceCandidate(rawPayload) {
      const parsedPayload = BroadcastVideoIceCandidatePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      optionsRef.current.onIceCandidate(parsedPayload.data);
    });

    socket.on(VideoRoomSocketEvent.VideoMediaToggle, function handleVideoMediaToggle(rawPayload) {
      const parsedPayload = BroadcastVideoMediaTogglePayloadSchema.safeParse(rawPayload);

      if (!parsedPayload.success) {
        handleInvalidPayload();
        return;
      }

      setParticipants((currentParticipants) =>
        currentParticipants.map((participant) => {
          if (participant.socketId !== parsedPayload.data.fromSocketId) {
            return participant;
          }

          return {
            ...participant,
            audioEnabled:
              parsedPayload.data.kind === 'audio' ? parsedPayload.data.enabled : participant.audioEnabled,
            videoEnabled:
              parsedPayload.data.kind === 'video' ? parsedPayload.data.enabled : participant.videoEnabled,
          };
        }),
      );
    });

    socket.on(VideoRoomSocketEvent.VideoRoomError, function handleVideoRoomError(rawPayload) {
      const parsedPayload = VideoRoomErrorPayloadSchema.safeParse(rawPayload);
      setErrorMessage(parsedPayload.success ? parsedPayload.data.message : 'The video room hit an unexpected error.');
    });

    signalRef.current = {
      leaveVideoRoom() {
        socket.emit(VideoRoomSocketEvent.LeaveVideoRoom, { interviewId: options.interviewId });
      },
      sendAnswer(targetSocketId, answer) {
        socket.emit(VideoRoomSocketEvent.VideoAnswer, {
          answer,
          interviewId: options.interviewId,
          targetSocketId,
        });
      },
      sendIceCandidate(targetSocketId, candidate) {
        socket.emit(VideoRoomSocketEvent.VideoIceCandidate, {
          candidate,
          interviewId: options.interviewId,
          targetSocketId,
        });
      },
      sendMediaToggle(kind, enabled) {
        socket.emit(VideoRoomSocketEvent.VideoMediaToggle, {
          enabled,
          interviewId: options.interviewId,
          kind,
        });
      },
      sendOffer(targetSocketId, offer) {
        socket.emit(VideoRoomSocketEvent.VideoOffer, {
          interviewId: options.interviewId,
          offer,
          targetSocketId,
        });
      },
    };

    return function cleanupVideoRoomSocket() {
      signalRef.current?.leaveVideoRoom();
      signalRef.current = null;
      socket.disconnect();
      setParticipants([]);
      setSelfParticipant(null);
    };
  }, [authToken, options.enabled, options.interviewId]);

  return {
    errorMessage,
    leaveVideoRoom: () => signalRef.current?.leaveVideoRoom(),
    participants,
    selfParticipant,
    sendAnswer: (targetSocketId, answer) => signalRef.current?.sendAnswer(targetSocketId, answer),
    sendIceCandidate: (targetSocketId, candidate) => signalRef.current?.sendIceCandidate(targetSocketId, candidate),
    sendMediaToggle: (kind, enabled) => signalRef.current?.sendMediaToggle(kind, enabled),
    sendOffer: (targetSocketId, offer) => signalRef.current?.sendOffer(targetSocketId, offer),
    signalingState,
  };
}
