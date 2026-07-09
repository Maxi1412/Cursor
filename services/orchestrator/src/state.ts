import {
  ALL_OFF,
  CAPABILITIES,
  COLLECTIONS,
  DOC_IDS,
  type Capability,
  type CategoryConfig,
  type FeatureState,
  type Mode,
} from '@mediadeck/types';
import { isEnabled, isPending, type CatCfgMap } from '@mediadeck/core';
import type { StorageProvider } from '@mediadeck/storage';

/** Load the feature masters (`features/state`), defaulting to all-off. */
export async function loadFeatures(storage: StorageProvider): Promise<FeatureState> {
  const doc = await storage.getDoc<Record<Capability, boolean>>(
    COLLECTIONS.features,
    DOC_IDS.featureState,
  );
  // Return a clean capability-only object (the stored doc also carries an `id` field).
  const out = { ...ALL_OFF };
  if (doc) for (const cap of CAPABILITIES) out[cap] = doc[cap] === true;
  return out;
}

/** Persist the feature masters. */
export async function saveFeatures(
  storage: StorageProvider,
  features: FeatureState,
): Promise<void> {
  await storage.setDoc(COLLECTIONS.features, DOC_IDS.featureState, { ...features });
}

/** Load all `catCfg/{mode:cat}` docs into a scope→flags map for the core gate. */
export async function loadCatCfg(storage: StorageProvider): Promise<CatCfgMap> {
  const docs = await storage.queryDocs<CategoryConfig & { id: string }>(COLLECTIONS.catCfg);
  const map: Record<string, CategoryConfig> = {};
  for (const d of docs) {
    const { id, ...flags } = d;
    map[id] = flags as CategoryConfig;
  }
  return map;
}

/** Read the full two-tier state at once. */
export async function loadState(storage: StorageProvider): Promise<{
  features: FeatureState;
  catCfg: CatCfgMap;
}> {
  const [features, catCfg] = await Promise.all([loadFeatures(storage), loadCatCfg(storage)]);
  return { features, catCfg };
}

/** Convenience: is a capability live for (mode, cat) given current stored state? */
export async function capabilityLive(
  storage: StorageProvider,
  cap: Capability,
  mode: Mode,
  cat: string,
): Promise<{ enabled: boolean; pending: boolean }> {
  const { features, catCfg } = await loadState(storage);
  return {
    enabled: isEnabled(cap, mode, cat, features, catCfg),
    pending: isPending(cap, mode, cat, features, catCfg),
  };
}
