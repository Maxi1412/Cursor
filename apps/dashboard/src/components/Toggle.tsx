import type { CSSProperties } from 'react';

interface ToggleProps {
  on: boolean;
  onChange: () => void;
  /** Small variant (used in Schedules sub-rows). */
  small?: boolean;
  /** Accent color when on (CSS var or hex). Defaults to --live via the `.on` class. */
  color?: string;
  disabled?: boolean;
}

/** The prototype's `.md-tg` pill switch. */
export function Toggle({ on, onChange, small, color, disabled }: ToggleProps) {
  const style: CSSProperties | undefined =
    on && color ? { background: color, borderColor: color } : undefined;
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      className={`md-tg${small ? ' sm' : ''}${on ? ' on' : ''}`}
      style={style}
      onClick={() => {
        if (!disabled) onChange();
      }}
    >
      <i />
    </div>
  );
}
