import { describe, it, expect } from 'vitest';
import type { SonarrSeries } from '@mediadeck/types';
import { buildSonarrIndex, matchSonarrSeries, missingCountFor } from './sonarrMatch.js';

const series: SonarrSeries = {
  id: 4,
  title: 'The Boys',
  statistics: { episodeCount: 32, episodeFileCount: 29, totalEpisodeCount: 32 },
};

describe('sonarr matching', () => {
  it('matches by normalized title, ignoring case/punctuation', () => {
    const idx = buildSonarrIndex([series]);
    expect(matchSonarrSeries(idx, 'the boys')).toBe(series);
    expect(matchSonarrSeries(idx, 'THE-BOYS!')).toBe(series);
    expect(matchSonarrSeries(idx, 'Severance')).toBeUndefined();
  });

  it('computes missing as aired-monitored minus on-disk, never negative', () => {
    expect(missingCountFor(series)).toBe(3);
    expect(missingCountFor({ ...series, statistics: { episodeCount: 10, episodeFileCount: 12 } })).toBe(0);
    expect(missingCountFor({ ...series, statistics: undefined })).toBe(0);
  });
});
