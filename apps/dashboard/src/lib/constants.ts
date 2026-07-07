import type { Mode } from '@mediadeck/types';

/**
 * Baseline category lists mirroring the prototype (minus "All", which the UI adds).
 * The live app unions these with the real categories from `/api/collection` so the
 * Settings + Library category controls are always populated even before a scan.
 */
export const TV_CATS: readonly string[] = ['Action', 'Animated', 'Comics', 'DC', 'Marvel', 'Sci-Fi', 'Fantasy'];
export const MOVIE_CATS: readonly string[] = [
  'Action',
  'Anime',
  'Drama',
  'Comedy',
  'DC Movies',
  'Fantasy Movies',
  'Marvel Movies',
  'Sci-fi Movies',
  'Horror Movies',
  'Thriller Movies',
];

export function baseCats(mode: Mode): readonly string[] {
  return mode === 'tv' ? TV_CATS : MOVIE_CATS;
}

/** Merge base + live categories, de-duplicated, order-stable. */
export function mergeCats(base: readonly string[], live: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...base, ...live]) {
    if (c && c !== 'All' && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}
