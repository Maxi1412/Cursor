import { ACK_COLLECTIONS } from '@mediadeck/storage';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * Organization scan. Compares a title's TMDB metadata (e.g. studio = Marvel vs DC)
 * against its folder and flags mismatches. FLAG-ONLY. "Ignore = lock in place" —
 * acknowledged items are persisted and never re-flagged (the user's choice is deliberate).
 */
export const organize: CapabilityModule = {
  key: 'organize',
  cadence: 'Monthly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('organize');
    const items = scopedItems(rc, 'organize');
    res.considered = items.length;
    const locked = new Set(
      (await rc.ctx.storage.queryDocs(ACK_COLLECTIONS.organizeIgnored)).map((d) => d.id),
    );
    // TODO(phase-7): compare TMDB production studio/genre vs the folder category; write a
    // `health` finding (kind: organize) for mismatches not in the acknowledged list.
    res.notes.push(
      `${items.length} enabled titles in scope; ${locked.size} locked-in-place (never re-flagged).`,
    );
    return res;
  },
};
