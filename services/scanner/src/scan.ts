import type { Config } from '@mediadeck/config';
import type { InventoryItem } from '@mediadeck/types';
import { walkMovies, walkTv } from './walk.js';
import { resolveMock } from './resolve.js';
import { ingest } from './ingest.js';

export interface ScanResult {
  items: InventoryItem[];
  written: number;
  tv: number;
  movies: number;
}

/** One full scan: walk both libraries, resolve metadata, ingest via the orchestrator. */
export async function runScan(config: Config, now: number): Promise<ScanResult> {
  const tv = walkTv(config.media.tv, now);
  const movies = walkMovies(config.media.movies, now);
  // TODO(phase-6): use resolveReal when TMDB/Sonarr are configured (config.adapters.*.ready).
  const items = resolveMock([...tv, ...movies]);
  const written = await ingest(config.server.publicUrl, items);
  return { items, written, tv: tv.length, movies: movies.length };
}
