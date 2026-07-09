import type { ReactNode } from 'react';

interface StatusChipProps {
  /** `ok` shows the live pulse dot; `path` uses the emphasised path style. */
  variant?: 'default' | 'ok' | 'path';
  icon?: ReactNode;
  children: ReactNode;
}

/** The prototype's `.md-chip` status pill (top strip + Settings › System). */
export function StatusChip({ variant = 'default', icon, children }: StatusChipProps) {
  return (
    <div className={`md-chip${variant === 'ok' ? ' ok' : ''}${variant === 'path' ? ' path' : ''}`}>
      {variant === 'ok' && <span className="dot" />}
      {icon}
      {children}
    </div>
  );
}
