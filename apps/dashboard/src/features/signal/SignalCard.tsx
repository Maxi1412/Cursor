import type { ReactNode } from 'react';
import { PosterGradient } from '../../components/PosterGradient';

interface SignalCardProps {
  title: string;
  seed: string;
  posterUrl?: string;
  context: string;
  /** Middle meta line (below the title). */
  meta: ReactNode;
  /** Right-hand column (buttons / chevrons / progress). */
  right: ReactNode;
  live?: boolean;
  onClick?: () => void;
}

/** The prototype's `.md-sig` row used across every Signal section. */
export function SignalCard({
  title,
  seed,
  posterUrl,
  context,
  meta,
  right,
  live,
  onClick,
}: SignalCardProps) {
  return (
    <div className={`md-sig${live ? ' live' : ''}`} onClick={onClick}>
      <PosterGradient className="md-poster" title={title} seed={seed} posterUrl={posterUrl} />
      <div className="md-sig-mid">
        <div className="md-sig-net">{context}</div>
        <div className="md-sig-title">{title}</div>
        {meta}
      </div>
      {right}
    </div>
  );
}
