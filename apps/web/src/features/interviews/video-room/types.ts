export type LocalMediaStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

export type LocalMediaState = {
  audioEnabled: boolean;
  errorMessage: string | null;
  status: LocalMediaStatus;
  stream: MediaStream | null;
  videoEnabled: boolean;
};
