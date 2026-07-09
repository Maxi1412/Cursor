import type { ProvenanceSource } from '@mediadeck/types';

/** Canonical display order for the provenance chips on a grounded Deck reply. */
export const PROVENANCE_ORDER: readonly ProvenanceSource[] = [
  'Memory',
  'Download Station',
  'Library index',
  'Files',
];

/**
 * Normalize a set of consulted sources into deduped, canonically-ordered chips.
 * Deck's pre-answer checks register what they touched; this renders them consistently.
 */
export function provenanceChips(sources: Iterable<ProvenanceSource>): ProvenanceSource[] {
  const seen = new Set(sources);
  return PROVENANCE_ORDER.filter((s) => seen.has(s));
}
