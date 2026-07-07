import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * New releases. Watches theatrical→physical/digital windows (movies) and new seasons
 * (TV). FLAG-ONLY — only genuine Blu-ray/WEB releases, never cam/telesync rips; the
 * user approves each add, which then downloads to the correct category folder.
 */
export const releases: CapabilityModule = {
  key: 'releases',
  cadence: 'Daily',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('releases');
    res.considered = scopedItems(rc, 'releases').length;
    // TODO(phase-7): query TMDB/Sonarr release windows for enabled categories; surface
    // real Blu-ray/WEB releases to Signal "New releases" (gated), reject early rips.
    res.notes.push('Release-window watch is scoped to enabled categories (detection: phase-7).');
    return res;
  },
};
