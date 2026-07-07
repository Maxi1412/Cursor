import { COLLECTIONS, type HealthFinding, type InventoryItem } from '@mediadeck/types';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Duplicate scan. Detects the same title appearing more than once within the enabled
 * scope (e.g. a 1080p and a 2160p copy). FLAG-ONLY here — writes a `health` finding;
 * the recycle-the-lower-copy action is user-approved (recoverable, never hard-delete).
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
      const key = norm(it.title);
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
    }

    const now = Date.now();
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const first = group[0]!;
      const finding: HealthFinding = {
        id: `dup:${norm(first.title)}`,
        kind: 'dup',
        title: first.title,
        mode: first.mode,
        cat: first.cat,
        detail: `${group.length} copies · ${group.map((g) => g.quality ?? '?').join(' + ')}`,
        status: 'open',
        mediaId: first.id,
        ts: now,
      };
      await rc.ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);
      res.flagged++;
    }
    res.notes.push(`${res.flagged} duplicate group(s) flagged (recycle on approval).`);
    return res;
  },
};
