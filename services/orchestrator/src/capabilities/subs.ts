import { COLLECTIONS } from '@mediadeck/types';
import { ACK_COLLECTIONS } from '@mediadeck/storage';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';
import { findAndWriteThaiSubtitle, type SubtitleSource } from '../subtitles/chain.js';
import { MOCK_SUBTITLE_SOURCES, createOpenSubtitlesSource } from '../subtitles/sources.js';

function sourcesFor(rc: RunContext): SubtitleSource[] {
  const cfg = rc.ctx.config.adapters.subtitles;
  if (cfg.mode === 'real' && cfg.openSubtitlesApiKey) {
    // Real source(s) first, mock as a last-resort so the chain always terminates cleanly.
    return [createOpenSubtitlesSource(cfg.openSubtitlesApiKey), ...MOCK_SUBTITLE_SOURCES];
  }
  return MOCK_SUBTITLE_SOURCES;
}

/**
 * Thai subtitles. For each enabled title without a Thai track (and not ignored), try a
 * fallback chain of sources; write `<exact title>.th.srt` next to the media file so DS
 * Video Station reads it as Thai. Honest "unavailable" logging when no source has it —
 * never silently fails. Respects the ignore list (spec §8).
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
    const sources = sourcesFor(rc);

    let found = 0;
    let unavailable = 0;
    for (const item of missing) {
      const result = await findAndWriteThaiSubtitle(sources, item.title, item.year, item.path);
      if (result.status === 'found') {
        found++;
        await rc.ctx.storage.updateDoc(COLLECTIONS.inventory, item.id, { subTH: true });
      } else {
        unavailable++;
        // Honest: logged, not re-attempted every run beyond this note — the item still
        // shows in Needs Attention until the user finds/ignores it (spec §8).
      }
    }
    res.flagged = found;
    res.notes.push(
      `${missing.length} enabled titles were missing Thai subs (${ignored.size} ignored, skipped): ` +
        `${found} found & written, ${unavailable} unavailable.`,
    );
    return res;
  },
};
