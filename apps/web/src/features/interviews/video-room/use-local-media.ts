'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocalMediaState } from './types';

const initialLocalMediaState: LocalMediaState = {
  audioEnabled: true,
  errorMessage: null,
  status: 'idle',
  stream: null,
  videoEnabled: true,
};

export function useLocalMedia(): LocalMediaState & {
  startLocalMedia: () => Promise<void>;
  stopLocalMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
} {
  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<LocalMediaState>(initialLocalMediaState);

  useEffect(() => {
    activeRef.current = true;

    return function cleanupLocalMedia() {
      activeRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  async function startLocalMedia(): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      errorMessage: null,
      status: 'requesting',
    }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      if (!activeRef.current) {
        stopStream(stream);
        return;
      }

      stopStream(streamRef.current);
      streamRef.current = stream;
      setState({
        audioEnabled: hasEnabledTrack(stream.getAudioTracks()),
        errorMessage: null,
        status: 'ready',
        stream,
        videoEnabled: hasEnabledTrack(stream.getVideoTracks()),
      });
    } catch (error) {
      const isPermissionDenied =
        error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');

      setState((currentState) => ({
        ...currentState,
        errorMessage: isPermissionDenied
          ? 'Camera or microphone permission was denied.'
          : 'Could not start the camera or microphone.',
        status: isPermissionDenied ? 'denied' : 'error',
        stream: null,
      }));
    }
  }

  function stopLocalMedia(): void {
    stopStream(streamRef.current);
    streamRef.current = null;
    setState(initialLocalMediaState);
  }

  function toggleAudio(): void {
    const stream = streamRef.current;

    if (!stream) {
      return;
    }

    const nextEnabled = !hasEnabledTrack(stream.getAudioTracks());
    setTracksEnabled(stream.getAudioTracks(), nextEnabled);
    setState((currentState) => ({
      ...currentState,
      audioEnabled: nextEnabled,
    }));
  }

  function toggleVideo(): void {
    const stream = streamRef.current;

    if (!stream) {
      return;
    }

    const nextEnabled = !hasEnabledTrack(stream.getVideoTracks());
    setTracksEnabled(stream.getVideoTracks(), nextEnabled);
    setState((currentState) => ({
      ...currentState,
      videoEnabled: nextEnabled,
    }));
  }

  return {
    ...state,
    startLocalMedia,
    stopLocalMedia,
    toggleAudio,
    toggleVideo,
  };
}

function hasEnabledTrack(tracks: MediaStreamTrack[]): boolean {
  return tracks.some((track) => track.enabled);
}

function setTracksEnabled(tracks: MediaStreamTrack[], enabled: boolean): void {
  for (const track of tracks) {
    track.enabled = enabled;
  }
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
}
