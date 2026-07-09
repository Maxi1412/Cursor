import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { TmdbAdapter } from '../adapters/types.js';

/**
 * Real TMDB posters, cached locally so the PWA never hot-links TMDB and loads fast
 * (spec §3). The browser only ever talks to the orchestrator's own `/api/posters/:id`.
 */

// A tiny, valid 1x1 transparent PNG — the on-disk placeholder when no real poster exists
// (mock TMDB, or a real lookup that returned nothing). Keeps the caching pipeline fully
// exercised end-to-end with zero credentials.
const PLACEHOLDER_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
);

export function posterFilePath(cacheDir: string, mediaId: string): string {
  return join(cacheDir, `${mediaId}.png`);
}

export async function hasCachedPoster(cacheDir: string, mediaId: string): Promise<boolean> {
  try {
    await stat(posterFilePath(cacheDir, mediaId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Cache a title's poster locally. In mock mode (or when TMDB has no poster for this
 * title) writes the placeholder so the pipeline still runs end-to-end with no credential.
 * Returns the relative URL the PWA should use, or null if caching failed.
 */
export async function cachePoster(
  cacheDir: string,
  tmdb: TmdbAdapter,
  mediaId: string,
  posterPath: string | null | undefined,
): Promise<string | null> {
  await mkdir(cacheDir, { recursive: true });
  const dest = posterFilePath(cacheDir, mediaId);

  if (tmdb.mode === 'mock' || !posterPath) {
    await writeFile(dest, PLACEHOLDER_PNG);
    return `/api/posters/${mediaId}`;
  }

  try {
    const res = await fetch(tmdb.posterUrl(posterPath));
    if (!res.ok) throw new Error(`poster fetch ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return `/api/posters/${mediaId}`;
  } catch {
    // Honest fallback — never leave the item with a dangling poster URL.
    await writeFile(dest, PLACEHOLDER_PNG);
    return `/api/posters/${mediaId}`;
  }
}
