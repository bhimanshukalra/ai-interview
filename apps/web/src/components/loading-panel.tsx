import { ScreenStatePanel } from './screen-state-panel';

type LoadingPanelProps = {
  eyebrow: string;
  title: string;
  lines?: number;
};

export function LoadingPanel({ eyebrow, title, lines = 3 }: LoadingPanelProps): React.ReactElement {
  return <ScreenStatePanel eyebrow={eyebrow} lines={lines} role="status" title={title} />;
}
