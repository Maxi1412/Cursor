import {
  ALL_OFF,
  COLLECTIONS,
  DOC_IDS,
  type HealthFinding,
  type InventoryItem,
  type Notification,
  type DownloadStatus,
} from '@mediadeck/types';
import type { StorageProvider } from './provider.js';

/** The two acknowledged sub-lists, as collection paths (§10). */
export const ACK_COLLECTIONS = {
  subsIgnored: 'acknowledged/subsIgnored',
  organizeIgnored: 'acknowledged/organizeIgnored',
} as const;

const T0 = 1_700_000_000_000; // fixed epoch base so seeds are deterministic (no Date.now)

/**
 * A compact demo library that mirrors the scanner's sample media tree EXACTLY — same
 * slug ids the scanner produces (`slug(title)`) — so a real scan cleanly overwrites these
 * seeds instead of duplicating them. Populates the UI before the first scan; after a scan
 * the scanner is authoritative.
 */
const INVENTORY: InventoryItem[] = [
  { id: 'the-simpsons', mode: 'tv', cat: 'Animated', type: 'series', title: 'The Simpsons', path: 'T:\\TV Shows\\Animated\\The Simpsons', quality: '1080p', seasonsOnDisk: [36], missingCount: 0, subTH: true, lastScanned: T0 },
  { id: 'severance', mode: 'tv', cat: 'Sci-Fi', type: 'series', title: 'Severance', path: 'T:\\TV Shows\\Sci-Fi\\Severance', quality: '2160p', seasonsOnDisk: [2], missingCount: 0, subTH: false, lastScanned: T0 },
  { id: 'one-piece', mode: 'tv', cat: 'Animated', type: 'series', title: 'One Piece', path: 'T:\\TV Shows\\Animated\\One Piece', quality: '1080p', seasonsOnDisk: [21], missingCount: 12, subTH: true, lastScanned: T0 },
  { id: 'the-boys', mode: 'tv', cat: 'Comics', type: 'series', title: 'The Boys', path: 'T:\\TV Shows\\Comics\\The Boys', quality: '2160p', seasonsOnDisk: [4], missingCount: 3, subTH: false, lastScanned: T0 },
  { id: 'dune-part-two', mode: 'movies', cat: 'Sci-fi Movies', type: 'movie', title: 'Dune Part Two', year: 2024, path: 'M:\\Movies\\Sci-fi Movies\\Dune Part Two (2024)', quality: '2160p', seasonsOnDisk: [], missingCount: 0, subTH: true, lastScanned: T0 },
  { id: 'deadpool-wolverine', mode: 'movies', cat: 'DC Movies', type: 'movie', title: 'Deadpool & Wolverine', year: 2024, path: 'M:\\Movies\\DC Movies\\Deadpool & Wolverine (2024)', quality: '1080p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: T0 },
  { id: 'rocky', mode: 'movies', cat: 'Action', type: 'movie', title: 'Rocky', year: 1976, path: 'M:\\Movies\\Action\\Rocky (1976)', quality: '720p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: T0 },
  { id: 'the-dark-knight', mode: 'movies', cat: 'DC Movies', type: 'movie', title: 'The Dark Knight', year: 2008, path: 'M:\\Movies\\DC Movies\\The Dark Knight (2008)', quality: '2160p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: T0 },
];

const HEALTH: HealthFinding[] = [
  { id: 'dup:thedarkknight', kind: 'dup', title: 'The Dark Knight', mode: 'movies', cat: 'DC Movies', detail: '2 copies · 1080p + 2160p', status: 'open', mediaId: 'the-dark-knight', relatedIds: [], ts: T0 },
  { id: 'corr1', kind: 'corrupt', title: 'John Wick 4', mode: 'movies', cat: 'Action', detail: 'No audio track detected', status: 'open', relatedIds: [], ts: T0 },
  { id: 'org1', kind: 'organize', title: 'Deadpool & Wolverine', mode: 'movies', cat: 'DC Movies', detail: 'In DC Movies · studio suggests Marvel', status: 'open', mediaId: 'deadpool-wolverine', relatedIds: [], expectedCat: 'Marvel Movies', ts: T0 },
];

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Grabbed The Simpsons', event: 'grab', episode: 'S36E14', detail: 'added to Download Station', ts: T0 - 2 * 3600_000, delivered: true, seen: false, mediaId: 'simpsons' },
  { id: 'n2', title: 'New episode detected', event: 'new-episode', episode: 'S02E08', detail: 'Severance · Apple TV+', ts: T0 - 5 * 3600_000, delivered: true, seen: false, mediaId: 'severance' },
  { id: 'n3', title: 'Gap found: One Piece', event: 'missing', detail: '12 missing episodes flagged', ts: T0 - 9 * 3600_000, delivered: true, seen: false, mediaId: 'onepiece' },
];

const DOWNLOADS: DownloadStatus[] = [
  { extId: 'ds1', title: 'The Simpsons S36E14', state: 'completed', dest: 'tv/Animated', pct: 100, ts: T0 - 2 * 3600_000 },
  { extId: 'ds2', title: 'Die Hard 3', state: 'downloading', dest: 'movies/Action', pct: 62, ts: T0 - 1 * 3600_000 },
];

/**
 * Populate a fresh backend with demo data so the PWA is fully populated in local dev.
 * Idempotent: safe to run repeatedly. Feature masters are seeded ALL-OFF (spec §5).
 */
export async function seedFixtures(storage: StorageProvider): Promise<void> {
  await storage.setDoc(COLLECTIONS.features, DOC_IDS.featureState, { ...ALL_OFF });
  for (const it of INVENTORY) await storage.setDoc(COLLECTIONS.inventory, it.id, it);
  for (const h of HEALTH) await storage.setDoc(COLLECTIONS.health, h.id, h);
  for (const n of NOTIFICATIONS) await storage.setDoc(COLLECTIONS.notifications, n.id, n);
  for (const d of DOWNLOADS) await storage.setDoc(COLLECTIONS.downloadStatus, d.extId, d);
}
