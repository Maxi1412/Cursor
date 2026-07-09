import type { SonarrSeries } from '@mediadeck/types';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

export function buildSonarrIndex(series: SonarrSeries[]): Map<string, SonarrSeries> {
  const map = new Map<string, SonarrSeries>();
  for (const s of series) map.set(norm(s.title), s);
  return map;
}

export function matchSonarrSeries(
  index: Map<string, SonarrSeries>,
  title: string,
): SonarrSeries | undefined {
  return index.get(norm(title));
}

/** Monitored & aired episodes minus what's actually on disk — never negative. */
export function missingCountFor(series: SonarrSeries): number {
  const stats = series.statistics;
  if (!stats) return 0;
  const aired = stats.episodeCount ?? 0;
  const onDisk = stats.episodeFileCount ?? 0;
  return Math.max(0, aired - onDisk);
}
