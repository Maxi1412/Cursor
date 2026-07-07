import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** The prototype's scrim + `.md-sheet` bottom sheet. */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;
  return (
    <>
      <div className="md-scrim" onClick={onClose} />
      <div className="md-sheet" role="dialog" aria-modal="true">
        <div className="md-sheet-grip" />
        <div className="md-sheet-scroll">{children}</div>
      </div>
    </>
  );
}
