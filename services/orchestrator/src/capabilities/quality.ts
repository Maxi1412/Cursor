import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

const RES_RANK: Record<string, number> = { '480p': 1, '720p': 2, '1080p': 3, '1440p': 4, '2160p': 5 };

/**
 * Quality upgrades. FLAG-ONLY — below-1080p titles (and 4K-upgrade candidates) are
 * surfaced for the user to approve. Never auto-downloads. The safe-swap (verify the
 * new file, then move the old one to the Recycle Bin) happens on approval, not here.
 */
export const quality: CapabilityModule = {
  key: 'quality',
  cadence: 'Weekly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('quality');
    const items = scopedItems(rc, 'quality');
    res.considered = items.length;
    const below = items.filter((it) => (RES_RANK[it.quality ?? ''] ?? 3) < RES_RANK['1080p']!);
    res.flagged = below.length;
    // TODO(phase-7): also flag 1080p→2160p upgrade candidates; on approval, verify-before-swap.
    res.notes.push(`${below.length} enabled titles below 1080p flagged for approval (flag-only).`);
    return res;
  },
};
