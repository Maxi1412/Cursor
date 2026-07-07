import { ACK_COLLECTIONS } from '@mediadeck/storage';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * Thai subtitles. For each enabled title without a Thai track (and not ignored),
 * pull from a fallback chain and rename to `<exact title>.th.srt` in the same dir.
 * Honest "unavailable" logging; the ignore list is respected.
 */
export const subs: CapabilityModule = {
  key: 'subs',
  cadence: 'Live · daily',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('subs');
    const items = scopedItems(rc, 'subs');
    res.considered = items.length;

    const ignored = new Set(
      (await rc.ctx.storage.queryDocs(ACK_COLLECTIONS.subsIgnored)).map((d) => d.id),
    );
    const missing = items.filter((it) => !it.subTH && !ignored.has(it.id));
    res.flagged = missing.length;
    // TODO(phase-7): fetch from 2–3 sources (OpenSubtitles etc.) in a fallback chain,
    // write "<title>.th.srt" next to the media file, log titles with no Thai subs as
    // "unavailable" (never silently fail).
    res.notes.push(
      `${missing.length} enabled titles missing Thai subs (${ignored.size} ignored, skipped).`,
    );
    return res;
  },
};
