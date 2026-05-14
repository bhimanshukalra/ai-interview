import type React from 'react';

type ScreenStateTone = 'neutral' | 'danger';

type ScreenStatePanelProps = {
  actions?: React.ReactNode;
  eyebrow: string;
  lines?: number;
  message?: string;
  role?: 'alert' | 'status';
  size?: 'default' | 'full';
  title: string;
  tone?: ScreenStateTone;
};

const toneClasses: Record<ScreenStateTone, {
  border: string;
  eyebrow: string;
  surface: string;
  text: string;
  title: string;
}> = {
  neutral: {
    border: 'border-stone-200',
    eyebrow: 'text-teal-700',
    surface: 'bg-white',
    text: 'text-stone-600',
    title: 'text-stone-950',
  },
  danger: {
    border: 'border-red-200',
    eyebrow: 'text-red-700',
    surface: 'bg-red-50',
    text: 'text-red-800',
    title: 'text-red-950',
  },
};

export function ScreenStatePanel({
  actions,
  eyebrow,
  lines,
  message,
  role,
  size = 'default',
  title,
  tone = 'neutral',
}: ScreenStatePanelProps): React.ReactElement {
  const classes = toneClasses[tone];
  const sizeClass = size === 'full' ? 'w-full' : 'w-full max-w-xl';

  return (
    <section
      className={`${sizeClass} rounded-lg border ${classes.border} ${classes.surface} p-6 shadow-sm sm:p-8`}
      role={role}
    >
      <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${classes.eyebrow}`}>{eyebrow}</p>
      <h1 className={`text-3xl font-bold ${classes.title}`}>{title}</h1>
      {message ? <p className={`mt-3 leading-7 ${classes.text}`}>{message}</p> : null}
      {typeof lines === 'number' ? <LoadingLines lines={lines} /> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </section>
  );
}

function LoadingLines({ lines }: { lines: number }): React.ReactElement {
  return (
    <div className="mt-6 grid gap-3" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-3 animate-pulse rounded-full bg-stone-200"
          style={{ width: `${92 - index * 14}%` }}
        />
      ))}
    </div>
  );
}
