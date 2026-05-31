'use client';

type VideoControlsProps = {
  audioEnabled: boolean;
  isActive: boolean;
  isStarting: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  videoEnabled: boolean;
};

const primaryButtonClass =
  'min-h-10 rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400';
const secondaryButtonClass =
  'min-h-10 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';
const dangerButtonClass =
  'min-h-10 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50';

export function VideoControls({
  audioEnabled,
  isActive,
  isStarting,
  onStart,
  onStop,
  onToggleAudio,
  onToggleVideo,
  videoEnabled,
}: VideoControlsProps): React.ReactElement {
  if (!isActive) {
    return (
      <button className={primaryButtonClass} disabled={isStarting} type="button" onClick={onStart}>
        {isStarting ? 'Starting video...' : 'Start video'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className={secondaryButtonClass} type="button" onClick={onToggleAudio}>
        {audioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button className={secondaryButtonClass} type="button" onClick={onToggleVideo}>
        {videoEnabled ? 'Camera off' : 'Camera on'}
      </button>
      <button className={dangerButtonClass} type="button" onClick={onStop}>
        End call
      </button>
    </div>
  );
}
