'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PeerConnectionStatus = RTCPeerConnectionState | 'idle';
type IceConnectionStatus = RTCIceConnectionState | 'idle';

type UsePeerConnectionOptions = {
  localStream: MediaStream | null;
  onConnectionRestartOffer: (targetSocketId: string, offer: RTCSessionDescriptionInit) => void;
  onIceCandidate: (targetSocketId: string, candidate: RTCIceCandidateInit) => void;
};

type UsePeerConnectionResult = {
  acceptAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addRemoteIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  answerOffer: (fromSocketId: string, offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>;
  callParticipant: (targetSocketId: string) => Promise<RTCSessionDescriptionInit | null>;
  clearPeerConnection: () => void;
  connectionState: PeerConnectionStatus;
  errorMessage: string | null;
  iceConnectionState: IceConnectionStatus;
  remoteSocketId: string | null;
  remoteStream: MediaStream | null;
};

const peerConnectionConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function usePeerConnection({
  localStream,
  onConnectionRestartOffer,
  onIceCandidate,
}: UsePeerConnectionOptions): UsePeerConnectionResult {
  const connectionRestartHandlerRef = useRef(onConnectionRestartOffer);
  const iceCandidateHandlerRef = useRef(onIceCandidate);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteSocketIdRef = useRef<string | null>(null);
  const restartInFlightRef = useRef(false);
  const [connectionState, setConnectionState] = useState<PeerConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState<IceConnectionStatus>('idle');
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    connectionRestartHandlerRef.current = onConnectionRestartOffer;
    iceCandidateHandlerRef.current = onIceCandidate;
  }, [onConnectionRestartOffer, onIceCandidate]);

  const clearPeerConnection = useCallback(function clearPeerConnection(): void {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingIceCandidatesRef.current = [];
    remoteSocketIdRef.current = null;
    restartInFlightRef.current = false;
    setConnectionState('idle');
    setErrorMessage(null);
    setIceConnectionState('idle');
    setRemoteSocketId(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => clearPeerConnection, [clearPeerConnection]);

  const restartPeerConnection = useCallback(async function restartPeerConnection(
    peerConnection: RTCPeerConnection,
    targetSocketId: string,
  ): Promise<void> {
    if (restartInFlightRef.current || peerConnection.signalingState !== 'stable') {
      return;
    }

    restartInFlightRef.current = true;

    try {
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);
      connectionRestartHandlerRef.current(targetSocketId, serializeSessionDescription(offer));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Could not reconnect the peer connection.');
    } finally {
      restartInFlightRef.current = false;
    }
  }, []);

  const createPeerConnection = useCallback(
    function createPeerConnection(targetSocketId: string): RTCPeerConnection | null {
      if (!localStream) {
        setErrorMessage('Start camera and microphone before joining the call.');
        return null;
      }

      if (peerConnectionRef.current && remoteSocketIdRef.current === targetSocketId) {
        return peerConnectionRef.current;
      }

      clearPeerConnection();

      const peerConnection = new RTCPeerConnection(peerConnectionConfig);
      peerConnectionRef.current = peerConnection;
      remoteSocketIdRef.current = targetSocketId;
      setRemoteSocketId(targetSocketId);
      setConnectionState(peerConnection.connectionState);
      setIceConnectionState(peerConnection.iceConnectionState);

      for (const track of localStream.getTracks()) {
        peerConnection.addTrack(track, localStream);
      }

      peerConnection.onicecandidate = function handleIceCandidate(event): void {
        if (!event.candidate) {
          return;
        }

        iceCandidateHandlerRef.current(targetSocketId, event.candidate.toJSON());
      };

      peerConnection.ontrack = function handleRemoteTrack(event): void {
        const [stream] = event.streams;

        if (stream) {
          setRemoteStream(stream);
          return;
        }

        setRemoteStream((currentStream) => {
          const nextStream = currentStream ?? new MediaStream();
          nextStream.addTrack(event.track);
          return nextStream;
        });
      };

      peerConnection.onconnectionstatechange = function handleConnectionStateChange(): void {
        setConnectionState(peerConnection.connectionState);

        if (peerConnection.connectionState === 'disconnected') {
          setErrorMessage('Peer connection disconnected. Waiting for the network to recover.');
        }

        if (peerConnection.connectionState === 'failed') {
          setErrorMessage('Peer connection failed. Trying to reconnect the call.');
          void restartPeerConnection(peerConnection, targetSocketId);
        }
      };

      peerConnection.oniceconnectionstatechange = function handleIceConnectionStateChange(): void {
        setIceConnectionState(peerConnection.iceConnectionState);
      };

      return peerConnection;
    },
    [clearPeerConnection, localStream, restartPeerConnection],
  );

  const flushPendingIceCandidates = useCallback(async function flushPendingIceCandidates(): Promise<void> {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection?.remoteDescription) {
      return;
    }

    const pendingCandidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    for (const candidate of pendingCandidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const callParticipant = useCallback(
    async function callParticipant(targetSocketId: string): Promise<RTCSessionDescriptionInit | null> {
      const peerConnection = createPeerConnection(targetSocketId);

      if (!peerConnection) {
        return null;
      }

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        setErrorMessage(null);
        return serializeSessionDescription(offer);
      } catch {
        setErrorMessage('Could not start the peer connection.');
        return null;
      }
    },
    [createPeerConnection],
  );

  const answerOffer = useCallback(
    async function answerOffer(
      fromSocketId: string,
      offer: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit | null> {
      const peerConnection = createPeerConnection(fromSocketId);

      if (!peerConnection) {
        return null;
      }

      try {
        await peerConnection.setRemoteDescription(offer);
        await flushPendingIceCandidates();
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        setErrorMessage(null);
        return serializeSessionDescription(answer);
      } catch {
        setErrorMessage('Could not answer the peer connection.');
        return null;
      }
    },
    [createPeerConnection, flushPendingIceCandidates],
  );

  const acceptAnswer = useCallback(
    async function acceptAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        return;
      }

      try {
        await peerConnection.setRemoteDescription(answer);
        await flushPendingIceCandidates();
        setErrorMessage(null);
      } catch {
        setErrorMessage('Could not finish the peer connection.');
      }
    },
    [flushPendingIceCandidates],
  );

  const addRemoteIceCandidate = useCallback(
    async function addRemoteIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      if (!peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(candidate);
        setErrorMessage(null);
      } catch {
        setErrorMessage('Could not add the remote network candidate.');
      }
    },
    [],
  );

  return {
    acceptAnswer,
    addRemoteIceCandidate,
    answerOffer,
    callParticipant,
    clearPeerConnection,
    connectionState,
    errorMessage,
    iceConnectionState,
    remoteSocketId,
    remoteStream,
  };
}

function serializeSessionDescription(description: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  return {
    sdp: description.sdp,
    type: description.type,
  };
}
