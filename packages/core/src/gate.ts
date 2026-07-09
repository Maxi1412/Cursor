import type { Capability, CapabilityFlags, FeatureState, Mode, ScopeKey } from '@mediadeck/types';
import { ALL_OFF, scopeKey } from '@mediadeck/types';

/** A read-only view of all `catCfg/{mode:cat}` documents, keyed by scope. */
export type CatCfgMap = Readonly<Record<string, Partial<CapabilityFlags>>>;

function flag(cfg: Partial<CapabilityFlags> | undefined, cap: Capability): boolean {
  return cfg?.[cap] === true;
}

/**
 * Is a capability toggled on for this category, considering the `{mode}:All` scope?
 * Mirrors the prototype's `catOn`: the whole-section scope OR the specific category.
 * This is ONLY the category tier — it does NOT consider the feature master.
 */
export function categoryEnabled(
  cap: Capability,
  mode: Mode,
  cat: string,
  catCfg: CatCfgMap,
): boolean {
  return flag(catCfg[scopeKey(mode, 'All')], cap) || flag(catCfg[scopeKey(mode, cat)], cap);
}

/**
 * THE two-tier gate. A capability acts on a category iff BOTH the feature master
 * AND the category toggle (or its `{mode}:All` scope) are on.
 *
 * This is the single source of truth — every capability module, the Schedules
 * projection, and Deck's action set must call this and nothing else.
 */
export function isEnabled(
  cap: Capability,
  mode: Mode,
  cat: string,
  features: FeatureState,
  catCfg: CatCfgMap,
): boolean {
  return features[cap] === true && categoryEnabled(cap, mode, cat, catCfg);
}

/**
 * Pending = the user turned a category toggle on, but the feature master is still off.
 * The UI shows an amber "Turn on {feature} in the main settings to start" note.
 */
export function isPending(
  cap: Capability,
  mode: Mode,
  cat: string,
  features: FeatureState,
  catCfg: CatCfgMap,
): boolean {
  return features[cap] !== true && categoryEnabled(cap, mode, cat, catCfg);
}

/** The default toggle set for a scope that has never been configured — all off. */
export function defaultFlags(): CapabilityFlags {
  return { ...ALL_OFF };
}

/** Resolve a scope's flags, falling back to all-off. */
export function getScope(catCfg: CatCfgMap, key: ScopeKey): CapabilityFlags {
  return { ...ALL_OFF, ...catCfg[key] };
}
