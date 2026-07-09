import type { InventoryItem } from '@mediadeck/types';

/**
 * Enrich walked items with metadata. In mock mode we stamp a deterministic tmdbId and a
 * poster reference so the index is populated with no network. In real mode (phase-6) this
 * resolves movies via TMDB (v4 Bearer token) and reads Sonarr /api/v3/series to fill
 * tvdbId/sonarrId/missingCount — TVDB stays Sonarr's TV source, TMDB provides posters.
 */
/**
 * Demo missing-episode counts (real detection is Sonarr Wanted/Missing, phase-6). Keyed by
 * the scanner's slug id so scanned items carry the same missingCount as the seed fixtures.
 */
const MOCK_MISSING: Record<string, number> = { 'one-piece': 12, 'the-boys': 3 };

export function resolveMock(items: InventoryItem[]): InventoryItem[] {
  return items.map((it) => {
    const id = Array.from(it.title).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1_000_000, 7);
    return {
      ...it,
      tmdbId: it.type === 'movie' ? id : it.tmdbId,
      missingCount: MOCK_MISSING[it.id] ?? it.missingCount,
      posterUrl: `/api/posters/${it.id}`, // served by the orchestrator's poster cache
    };
  });
}

// TODO(phase-6): resolveReal(items, { tmdb, sonarr }) — TMDB search for movies, Sonarr
// series match for TV (missingCount from Wanted/Missing), cache posters locally.
