import { z } from 'zod';

/** The two library sections. Movies map to `M:\`, TV to `T:\`. */
export const Mode = z.enum(['tv', 'movies']);
export type Mode = z.infer<typeof Mode>;

/** Media item kind (a movie is a single file; a TV series has seasons/episodes). */
export const MediaType = z.enum(['movie', 'series']);
export type MediaType = z.infer<typeof MediaType>;

/**
 * The 7 capabilities. Each has a feature master (`features/state`) AND a per-category
 * toggle (`catCfg/{mode:cat}`). Both must be on for the capability to act — see @mediadeck/core.
 *   grab     — auto-grab new episodes (TV only)
 *   subs     — Thai subtitles
 *   quality  — quality upgrades (below-1080p flags + 4K), flag-only
 *   releases — new releases (movies on disc/digital; new seasons for TV)
 *   dup      — duplicate scan
 *   corrupt  — corruption scan (ffprobe)
 *   organize — organization scan (folder vs metadata)
 */
export const Capability = z.enum(['grab', 'subs', 'quality', 'releases', 'dup', 'corrupt', 'organize']);
export type Capability = z.infer<typeof Capability>;

export const CAPABILITIES = Capability.options;

/** Capabilities that only make sense for TV. */
export const TV_ONLY_CAPABILITIES: readonly Capability[] = ['grab'];

/** A `{mode}:{cat}` scope key, e.g. `tv:Animated`, `movies:All`. `All` = the whole section. */
export const ScopeKey = z
  .string()
  .regex(/^(tv|movies):.+$/, 'scope key must look like "tv:Animated" or "movies:All"');
export type ScopeKey = z.infer<typeof ScopeKey>;

export function scopeKey(mode: Mode, cat: string): ScopeKey {
  return `${mode}:${cat}`;
}

export function parseScopeKey(key: string): { mode: Mode; cat: string } {
  const idx = key.indexOf(':');
  const mode = Mode.parse(key.slice(0, idx));
  return { mode, cat: key.slice(idx + 1) };
}

/** Epoch milliseconds. Kept as a plain number so it round-trips SQLite ⇄ Firestore cleanly. */
export const Timestamp = z.number().int().nonnegative();
export type Timestamp = z.infer<typeof Timestamp>;
