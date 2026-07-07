import { Check } from 'lucide-react';
import type { ProvenanceSource } from '@mediadeck/types';

/** A single Deck provenance chip (`.md-checkchip`) — a source Deck consulted. */
export function ProvenanceChip({ source }: { source: ProvenanceSource }) {
  return (
    <span className="md-checkchip">
      <Check size={9} /> {source}
    </span>
  );
}

export function ProvenanceChips({ sources }: { sources: ProvenanceSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="md-checked">
      {sources.map((s) => (
        <ProvenanceChip key={s} source={s} />
      ))}
    </div>
  );
}
