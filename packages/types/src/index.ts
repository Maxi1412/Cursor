export * from './common.js';
export * from './features.js';
export * from './collections.js';
export * from './dtos.js';

import type { InventoryItem, HealthFinding, DeckMemory, Notification, Job, DownloadStatus, Acknowledgement } from './collections.js';
import type { FeatureState, CategoryConfig } from './features.js';

/**
 * The 10 storage collections from the build spec (§10), as a typed registry.
 * `@mediadeck/storage` uses these ids; each maps to a document/row shape below.
 */
export const COLLECTIONS = {
  inventory: 'inventory',
  features: 'features',
  catCfg: 'catCfg',
  health: 'health',
  acknowledged: 'acknowledged',
  deckMemory: 'deckMemory',
  notifications: 'notifications',
  jobs: 'jobs',
  downloadStatus: 'downloadStatus',
} as const;

export type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Fixed document ids for singleton documents. */
export const DOC_IDS = {
  /** `features/state` — the master switches. */
  featureState: 'state',
} as const;

/** Sub-collection ids under `acknowledged`. */
export const ACK_LISTS = {
  subsIgnored: 'subsIgnored',
  organizeIgnored: 'organizeIgnored',
} as const;

/** Compile-time map of collection id → document shape (documentation + generics). */
export interface CollectionShapes {
  inventory: InventoryItem;
  features: FeatureState;
  catCfg: CategoryConfig;
  health: HealthFinding;
  acknowledged: Acknowledgement;
  deckMemory: DeckMemory;
  notifications: Notification;
  jobs: Job;
  downloadStatus: DownloadStatus;
}
