import type { Capability, InventoryItem } from '@mediadeck/types';
import { isEnabled, type CatCfgMap } from '@mediadeck/core';
import type { FeatureState } from '@mediadeck/types';
import type { AppContext } from '../context.js';

/** What a capability run reports back (surfaced in Activity + the run-now route). */
export interface CapabilityResult {
  key: Capability;
  /** How many inventory items were in scope (gate on). */
  considered: number;
  /** How many the capability acted on or flagged. */
  flagged: number;
  /** Human notes, incl. honest "unavailable"/TODO admissions. */
  notes: string[];
}

export interface CapabilityModule {
  key: Capability;
  /** Cadence label for Activity/logging. */
  cadence: string;
  run(ctx: RunContext): Promise<CapabilityResult>;
}

/** Snapshot passed to every capability so they all read the SAME state. */
export interface RunContext {
  ctx: AppContext;
  features: FeatureState;
  catCfg: CatCfgMap;
  inventory: InventoryItem[];
}

/** The inventory items a capability is allowed to act on (two-tier gate applied). */
export function scopedItems(rc: RunContext, key: Capability): InventoryItem[] {
  return rc.inventory.filter((it) => isEnabled(key, it.mode, it.cat, rc.features, rc.catCfg));
}

export function emptyResult(key: Capability): CapabilityResult {
  return { key, considered: 0, flagged: 0, notes: [] };
}
