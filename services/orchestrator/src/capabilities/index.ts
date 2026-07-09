import { COLLECTIONS, type Capability, type InventoryItem } from '@mediadeck/types';
import type { AppContext } from '../context.js';
import { loadState } from '../state.js';
import type { CapabilityModule, CapabilityResult, RunContext } from './base.js';
import { grab } from './grab.js';
import { subs } from './subs.js';
import { quality } from './quality.js';
import { releases } from './releases.js';
import { duplicates } from './duplicates.js';
import { corruption } from './corruption.js';
import { organize } from './organize.js';

export type { CapabilityModule, CapabilityResult } from './base.js';

/** All 7 capability modules, keyed by capability. */
export const CAPABILITY_MODULES: Record<Capability, CapabilityModule> = {
  grab,
  subs,
  quality,
  releases,
  dup: duplicates,
  corrupt: corruption,
  organize,
};

async function buildRunContext(ctx: AppContext): Promise<RunContext> {
  const { features, catCfg } = await loadState(ctx.storage);
  const inventory = await ctx.storage.queryDocs<InventoryItem>(COLLECTIONS.inventory);
  return { ctx, features, catCfg, inventory };
}

/** Run a single capability now (respects the two-tier gate internally). */
export async function runCapability(ctx: AppContext, key: Capability): Promise<CapabilityResult> {
  const rc = await buildRunContext(ctx);
  return CAPABILITY_MODULES[key].run(rc);
}

/**
 * Run every capability whose master is ON. Capabilities with the master off are skipped
 * entirely (nothing to do); per-category gating happens inside each module.
 */
export async function runEnabledCapabilities(ctx: AppContext): Promise<CapabilityResult[]> {
  const rc = await buildRunContext(ctx);
  const results: CapabilityResult[] = [];
  for (const key of Object.keys(CAPABILITY_MODULES) as Capability[]) {
    if (rc.features[key] !== true) continue;
    results.push(await CAPABILITY_MODULES[key].run(rc));
  }
  return results;
}
