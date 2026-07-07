import { z } from 'zod';

/**
 * Minimal DTOs for the external systems the orchestrator adapters speak to.
 * These are intentionally partial — only the fields MediaDeck uses. Adapters
 * validate upstream responses against these and drop the rest.
 */

/* ----------------------------- Sonarr (/api/v3) ----------------------------- */
export const SonarrSeries = z.object({
  id: z.number().int(),
  title: z.string(),
  tvdbId: z.number().int().optional(),
  tmdbId: z.number().int().optional(),
  year: z.number().int().optional(),
  path: z.string().optional(),
  monitored: z.boolean().optional(),
  seriesType: z.enum(['standard', 'daily', 'anime']).optional(),
  statistics: z
    .object({
      seasonCount: z.number().int().optional(),
      episodeFileCount: z.number().int().optional(),
      episodeCount: z.number().int().optional(),
      totalEpisodeCount: z.number().int().optional(),
    })
    .optional(),
  tags: z.array(z.number().int()).optional(),
});
export type SonarrSeries = z.infer<typeof SonarrSeries>;

export const SonarrRootFolder = z.object({
  id: z.number().int(),
  path: z.string(),
  accessible: z.boolean().optional(),
  freeSpace: z.number().optional(),
});
export type SonarrRootFolder = z.infer<typeof SonarrRootFolder>;

/* --------------------------------- TMDB ------------------------------------- */
export const TmdbMovie = z.object({
  id: z.number().int(),
  title: z.string(),
  release_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().optional(),
});
export type TmdbMovie = z.infer<typeof TmdbMovie>;

export const TmdbSearchResult = z.object({
  results: z.array(TmdbMovie).default([]),
});
export type TmdbSearchResult = z.infer<typeof TmdbSearchResult>;

/* --------------------- Synology Download Station API ------------------------ */
export const DsTask = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  size: z.number().optional(),
  additional: z
    .object({
      detail: z
        .object({
          destination: z.string().optional(),
        })
        .optional(),
      transfer: z
        .object({
          size_downloaded: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type DsTask = z.infer<typeof DsTask>;
