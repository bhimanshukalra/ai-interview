'use client';

import { useCallback, useMemo } from 'react';
import type { RtcIceCandidate, RtcSessionDescription, VideoParticipant } from '@ai-interview/shared';
import { useLocalMedia } from './use-local-media';
import { usePeerConnection } from './use-peer-connection';
import { useVideoRoomSocket } from './use-video-room-socket';
import { VideoControls } from './video-controls';
import { VideoTile } from './video-tile';

type InterviewVideoRoomProps = {
  interviewId: string;
};

const statusLabel = {
  denied: 'Permission denied',
  error: 'Media error',
  idle: 'Not started',
  ready: 'Camera ready',
  requesting: 'Starting',
};

export function InterviewVideoRoom({ interviewId }: InterviewVideoRoomProps): React.ReactElement {
  const {
    audioEnabled,
    errorMessage,
    startLocalMedia,
    status,
    stopLocalMedia,
    stream,
    toggleAudio,
    toggleVideo,
    videoEnabled,
  } = useLocalMedia();
  const isActive = Boolean(stream);
  const isStarting = status === 'requesting';
  const {
    acceptAnswer,
    addRemoteIceCandidate,
    answerOffer,
    callParticipant,
    clearPeerConnection,
    connectionState,
    errorMessage: peerErrorMessage,
    iceConnectionState,
    remoteSocketId,
    remoteStream,
  } = usePeerConnection({
    localStream: stream,
    onIceCandidate: handleLocalIceCandidate,
  });
  const {
    errorMessage: signalingErrorMessage,
    leaveVideoRoom,
    participants,
    selfParticipant,
    sendAnswer,
    sendIceCandidate,
    sendMediaToggle,
    sendOffer,
    signalingState,
  } = useVideoRoomSocket({
    enabled: isActive,
    interviewId,
    onAnswer: handleVideoAnswer,
    onIceCandidate: handleRemoteIceCandidate,
    onOffer: handleVideoOffer,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });
  const remoteParticipant = useMemo(
    () => participants.find((participant) => participant.socketId === remoteSocketId) ?? null,
    [participants, remoteSocketId],
  );
  const visibleErrorMessage = errorMessage ?? signalingErrorMessage ?? peerErrorMessage;

  function handleLocalIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    sendIceCandidate(targetSocketId, candidate);
  }

  async function handleUserJoined(participant: VideoParticipant): Promise<void> {
    if (participant.socketId === selfParticipant?.socketId || remoteSocketId) {
      return;
    }

    const offer = await callParticipant(participant.socketId);

    if (offer) {
      sendOffer(participant.socketId, offer);
    }
  }

  function handleUserLeft(participant: { socketId: string }): void {
    if (participant.socketId === remoteSocketId) {
      clearPeerConnection();
    }
  }

  async function handleVideoOffer(payload: { fromSocketId: string; offer: RtcSessionDescription }): Promise<void> {
    const answer = await answerOffer(payload.fromSocketId, payload.offer);

    if (answer) {
      sendAnswer(payload.fromSocketId, answer);
    }
  }

  async function handleVideoAnswer(payload: { answer: RtcSessionDescription }): Promise<void> {
    await acceptAnswer(payload.answer);
  }

  async function handleRemoteIceCandidate(payload: { candidate: RtcIceCandidate }): Promise<void> {
    await addRemoteIceCandidate(payload.candidate);
  }

  const handleToggleAudio = useCallback(
    function handleToggleAudio(): void {
      toggleAudio();
      sendMediaToggle('audio', !audioEnabled);
    },
    [audioEnabled, sendMediaToggle, toggleAudio],
  );

  const handleToggleVideo = useCallback(
    function handleToggleVideo(): void {
      toggleVideo();
      sendMediaToggle('video', !videoEnabled);
    },
    [sendMediaToggle, toggleVideo, videoEnabled],
  );

  const handleStopCall = useCallback(
    function handleStopCall(): void {
      leaveVideoRoom();
      clearPeerConnection();
      stopLocalMedia();
    },
    [clearPeerConnection, leaveVideoRoom, stopLocalMedia],
  );

  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Video room</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Interview call</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={statusLabel[status]} />
          <StatusPill label={`Signal: ${signalingState}`} />
          <StatusPill label={`Peer: ${connectionState}`} />
          <StatusPill label={`ICE: ${iceConnectionState}`} />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_16rem]">
        <div className="relative">
          <VideoTile
            audioEnabled={remoteParticipant?.audioEnabled ?? true}
            label={remoteParticipant?.name ?? 'Waiting for participant'}
            stream={remoteStream}
            videoEnabled={remoteParticipant?.videoEnabled ?? true}
          />
          {stream ? (
            <div className="absolute bottom-4 right-4 w-40 max-w-[40%] sm:w-48">
              <VideoTile
                audioEnabled={audioEnabled}
                label="You"
                muted
                stream={stream}
                variant="preview"
                videoEnabled={videoEnabled}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Room</p>
            <p className="mt-1 break-all text-sm font-semibold text-stone-800">{interviewId}</p>
            <p className="mt-2 text-sm text-stone-600">
              {participants.length ? `${participants.length} participant${participants.length === 1 ? '' : 's'}` : 'Not joined'}
            </p>
          </div>
          <VideoControls
            audioEnabled={audioEnabled}
            isActive={isActive}
            isStarting={isStarting}
            videoEnabled={videoEnabled}
            onStart={() => void startLocalMedia()}
            onStop={handleStopCall}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
          />
        </div>
      </div>

      {visibleErrorMessage ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{visibleErrorMessage}</p>
      ) : null}
    </section>
  );
}

function StatusPill({ label }: { label: string }): React.ReactElement {
  return (
    <span className="rounded-full border border-stone-200 px-3 py-1 text-sm font-semibold text-stone-700">
      {label}
    </span>
  );
}
