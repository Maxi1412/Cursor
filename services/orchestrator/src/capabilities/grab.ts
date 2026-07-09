import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * Auto-grab new episodes (TV only). For every enabled series with a resolved Sonarr id,
 * trigger a search for its wanted/missing episodes — Sonarr does the actual grabbing
 * once a release is found; newly-aired episodes surface separately via Signal's
 * "New signals" (Sonarr's wanted/missing feed, spec §3).
 */
export const grab: CapabilityModule = {
  key: 'grab',
  cadence: 'Every 30 min',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('grab');
    const items = scopedItems(rc, 'grab').filter((i) => i.type === 'series' && i.sonarrId != null);
    res.considered = items.length;

    let searched = 0;
    for (const item of items) {
      try {
        await rc.ctx.adapters.sonarr.searchMissing(item.sonarrId!);
        searched++;
      } catch (err) {
        res.notes.push(`${item.title}: Sonarr search failed — ${(err as Error).message}`);
      }
    }
    res.flagged = searched;
    res.notes.push(`${searched}/${items.length} enabled series searched via Sonarr for new episodes.`);
    return res;
  },
};
