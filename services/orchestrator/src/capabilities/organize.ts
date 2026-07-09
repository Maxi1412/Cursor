import { COLLECTIONS, type HealthFinding } from '@mediadeck/types';
import { ACK_COLLECTIONS } from '@mediadeck/storage';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/** Category-name keyword → studio-name substrings TMDB's production_companies should contain. */
const STUDIO_HINTS: Record<string, string[]> = {
  marvel: ['marvel'],
  dc: ['dc entertainment', 'dc films', 'dc studios'],
};
const DISPLAY_NAME: Record<string, string> = { marvel: 'Marvel', dc: 'DC' };

function categoryStudioKey(cat: string): string | null {
  return Object.keys(STUDIO_HINTS).find((k) => cat.toLowerCase().includes(k)) ?? null;
}

function matchedStudioKey(companies: string[]): string | null {
  for (const [key, hints] of Object.entries(STUDIO_HINTS)) {
    if (hints.some((h) => companies.some((c) => c.includes(h)))) return key;
  }
  return null;
}

/** "DC Movies" + expected key "marvel" -> "Marvel Movies"; "DC" (TV) + "marvel" -> "Marvel". */
function expectedCategoryName(currentCat: string, studioKey: string): string {
  const suffixMatch = currentCat.match(/\s+(Movies?)$/i);
  return suffixMatch ? `${DISPLAY_NAME[studioKey]}${suffixMatch[0]}` : DISPLAY_NAME[studioKey]!;
}

/**
 * Organization scan. Compares a title's TMDB production-company signal against its
 * folder category (e.g. category "DC Movies" but the studio is Marvel) and flags
 * mismatches. FLAG-ONLY. "Ignore" persists to organizeIgnored — locked in place,
 * never re-flagged (the user's organization choices are deliberate, spec §8).
 *
 * Honest limitation: without a real TMDB key there is no real studio signal to compare
 * against, so this capability no-ops with a clear note rather than fabricate mismatches.
 */
export const organize: CapabilityModule = {
  key: 'organize',
  cadence: 'Monthly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('organize');
    const items = scopedItems(rc, 'organize').filter((i) => i.type === 'movie' && i.tmdbId);
    res.considered = items.length;

    if (rc.ctx.adapters.tmdb.mode === 'mock') {
      res.notes.push('TMDB is in mock mode — no real studio data, organization scan skipped honestly.');
      return res;
    }

    const locked = new Set(
      (await rc.ctx.storage.queryDocs(ACK_COLLECTIONS.organizeIgnored)).map((d) => d.id),
    );
    const now = Date.now();
    for (const item of items) {
      if (locked.has(item.id)) continue;
      const expectedKey = categoryStudioKey(item.cat);
      if (!expectedKey) continue; // no known studio expectation for this category

      const details = await rc.ctx.adapters.tmdb.getMovieDetails(item.tmdbId!);
      if (!details) continue;
      const companies = details.production_companies.map((c) => c.name.toLowerCase());
      if (STUDIO_HINTS[expectedKey]!.some((h) => companies.some((c) => c.includes(h)))) continue; // matches — fine

      const otherKey = matchedStudioKey(companies);
      const finding: HealthFinding = {
        id: `org:${item.id}`,
        kind: 'organize',
        title: item.title,
        mode: item.mode,
        cat: item.cat,
        detail: otherKey
          ? `In ${item.cat} · studio suggests ${DISPLAY_NAME[otherKey]}`
          : `In ${item.cat} · studio doesn't match (${details.production_companies.map((c) => c.name).join(', ') || 'unknown'})`,
        status: 'open',
        mediaId: item.id,
        relatedIds: [],
        expectedCat: otherKey ? expectedCategoryName(item.cat, otherKey) : undefined,
        ts: now,
      };
      await rc.ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);
      res.flagged++;
    }
    res.notes.push(`${res.flagged} organization mismatch(es) flagged; ${locked.size} locked in place.`);
    return res;
  },
};
