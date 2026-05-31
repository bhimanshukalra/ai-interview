'use client';

import { useLocalMedia } from './use-local-media';
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

  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Video room</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Interview call</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={statusLabel[status]} />
          <StatusPill label="Peer not connected" />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_16rem]">
        <VideoTile
          audioEnabled={audioEnabled}
          label="You"
          muted
          stream={stream}
          videoEnabled={videoEnabled}
        />

        <div className="grid gap-3">
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Room</p>
            <p className="mt-1 break-all text-sm font-semibold text-stone-800">{interviewId}</p>
          </div>
          <VideoControls
            audioEnabled={audioEnabled}
            isActive={isActive}
            isStarting={isStarting}
            videoEnabled={videoEnabled}
            onStart={() => void startLocalMedia()}
            onStop={stopLocalMedia}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</p>
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
