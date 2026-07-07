import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * Corruption scan. Best-effort detection of missing/zero audio, broken/truncated, or
 * unplayable files via ffprobe + stream checks. FLAG-ONLY. Honest limitation: "no
 * sound / won't play" detection catches most but not all cases (spec §8).
 */
export const corruption: CapabilityModule = {
  key: 'corrupt',
  cadence: 'Weekly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('corrupt');
    res.considered = scopedItems(rc, 'corrupt').length;
    // TODO(phase-7): run `ffprobe` over each enabled file; flag no-audio / truncated /
    // unplayable as a `health` finding (kind: corrupt). Flag-only; re-download on approval.
    res.notes.push('ffprobe stream checks pending (phase-7); best-effort, not exhaustive.');
    return res;
  },
};
