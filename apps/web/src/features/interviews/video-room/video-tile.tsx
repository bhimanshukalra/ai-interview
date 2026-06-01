'use client';

import { useEffect, useRef } from 'react';

type VideoTileProps = {
  audioEnabled?: boolean;
  label: string;
  muted?: boolean;
  stream: MediaStream | null;
  variant?: 'main' | 'preview';
  videoEnabled?: boolean;
};

export function VideoTile({
  audioEnabled = true,
  label,
  muted = false,
  stream,
  variant = 'main',
  videoEnabled = true,
}: VideoTileProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPreview = variant === 'preview';

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;

    return function cleanupVideoSource() {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className={getTileClassName(isPreview)}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          className="h-full w-full object-cover"
          muted={muted}
          playsInline
        />
      ) : (
        <div className={getPlaceholderClassName(isPreview)}>
          Waiting for video
        </div>
      )}

      {!videoEnabled && stream ? (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/90 px-4 text-sm font-semibold text-stone-200">
          Camera off
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-white">
        <span>{label}</span>
        <span className="text-stone-300">{getMediaStatusLabel(audioEnabled, videoEnabled)}</span>
      </div>
    </div>
  );
}

function getTileClassName(isPreview: boolean): string {
  if (isPreview) {
    return 'relative aspect-video overflow-hidden rounded-lg bg-stone-950 shadow-lg ring-1 ring-white/20';
  }

  return 'relative aspect-video min-h-56 overflow-hidden rounded-lg bg-stone-950';
}

function getPlaceholderClassName(isPreview: boolean): string {
  const baseClassName = 'flex h-full items-center justify-center px-4 text-center text-sm font-medium text-stone-300';

  return isPreview ? baseClassName : `${baseClassName} min-h-56`;
}

function getMediaStatusLabel(audioEnabled: boolean, videoEnabled: boolean): string {
  if (audioEnabled && videoEnabled) {
    return 'Mic on · Camera on';
  }

  if (!audioEnabled && !videoEnabled) {
    return 'Mic muted · Camera off';
  }

  return audioEnabled ? 'Mic on · Camera off' : 'Mic muted · Camera on';
}
