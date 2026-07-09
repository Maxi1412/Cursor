import { COLLECTIONS, type HealthFinding, type InventoryItem } from '@mediadeck/types';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
const RES_RANK: Record<string, number> = { '480p': 1, '720p': 2, '1080p': 3, '1440p': 4, '2160p': 5 };
const rank = (q: string | undefined) => RES_RANK[q ?? ''] ?? 0;

/** Highest-quality item in a group is the one to KEEP; the rest are candidates to recycle. */
function pickKeeper(group: InventoryItem[]): { keeper: InventoryItem; rest: InventoryItem[] } {
  const sorted = [...group].sort((a, b) => rank(b.quality) - rank(a.quality));
  const [keeper, ...rest] = sorted;
  return { keeper: keeper!, rest };
}

/**
 * Duplicate scan. Detects the same title owned as more than one library entry within the
 * enabled scope (e.g. dropped into two category folders). FLAG-ONLY — writes a `health`
 * finding naming the best copy to KEEP and the others as `relatedIds`; the actual recycle
 * happens in the health-findings resolve route (user-approved, recoverable, §8).
 */
export const duplicates: CapabilityModule = {
  key: 'dup',
  cadence: 'Weekly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('dup');
    const items = scopedItems(rc, 'dup');
    res.considered = items.length;

    const groups = new Map<string, InventoryItem[]>();
    for (const it of items) {
      const key = `${it.mode}:${norm(it.title)}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
    }

    const now = Date.now();
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const { keeper, rest } = pickKeeper(group);
      const finding: HealthFinding = {
        id: `dup:${keeper.mode}:${norm(keeper.title)}`,
        kind: 'dup',
        title: keeper.title,
        mode: keeper.mode,
        cat: keeper.cat,
        detail: `${group.length} copies · keeping ${keeper.quality ?? '?'} · recycling ${rest.map((r) => r.quality ?? '?').join(', ')}`,
        status: 'open',
        mediaId: keeper.id,
        relatedIds: rest.map((r) => r.id),
        ts: now,
      };
      await rc.ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);
      res.flagged++;
    }
    res.notes.push(`${res.flagged} duplicate group(s) flagged (recycle on approval).`);
    return res;
  },
};
