import type { Capability, FeatureMeta, FeatureState, Mode } from '@mediadeck/types';
import { FEATURE_META, parseScopeKey } from '@mediadeck/types';
import type { CatCfgMap } from './gate.js';

/** One category row under a running feature in the Schedules tab. */
export interface ScheduleScope {
  key: string;
  mode: Mode;
  cat: string;
  /** e.g. "All TV shows", "Animated · TV", "Action · Movies". */
  label: string;
}

/** One feature card in the Schedules live projection. */
export interface ScheduleCard {
  capability: Capability;
  meta: FeatureMeta;
  scopes: ScheduleScope[];
}

function scopeLabel(mode: Mode, cat: string): string {
  if (cat === 'All') return mode === 'tv' ? 'All TV shows' : 'All movies';
  return `${cat} · ${mode === 'tv' ? 'TV' : 'Movies'}`;
}

/** The category scopes a capability is toggled on for (across all `catCfg` docs). */
export function scopesForCapability(cap: Capability, catCfg: CatCfgMap): ScheduleScope[] {
  return Object.keys(catCfg)
    .filter((key) => catCfg[key]?.[cap] === true)
    .map((key) => {
      const { mode, cat } = parseScopeKey(key);
      return { key, mode, cat, label: scopeLabel(mode, cat) };
    });
}

/**
 * The Schedules tab as a pure function of state: one card per ENABLED master feature,
 * each expanded into the categories it runs on. Because Signal, Settings, and behavior
 * all derive from the same `features × catCfg`, they can never disagree.
 */
export function projectSchedule(features: FeatureState, catCfg: CatCfgMap): ScheduleCard[] {
  return FEATURE_META.filter((f) => features[f.key] === true).map((meta) => ({
    capability: meta.key,
    meta,
    scopes: scopesForCapability(meta.key, catCfg),
  }));
}

/** Count of distinct scopes a capability runs on — for the "N categories" readouts. */
export function scopeCount(cap: Capability, catCfg: CatCfgMap): number {
  return scopesForCapability(cap, catCfg).length;
}
