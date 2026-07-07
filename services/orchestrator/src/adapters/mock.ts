import type {
  DownloadStatus,
  Notification,
  SonarrRootFolder,
  SonarrSeries,
  TmdbMovie,
} from '@mediadeck/types';
import type {
  DownloadStationAdapter,
  NtfyAdapter,
  ProwlarrAdapter,
  QbittorrentAdapter,
  SonarrAdapter,
  TmdbAdapter,
} from './types.js';

/**
 * Fully-functional in-memory mocks. These make the entire stack runnable with ZERO
 * credentials — realistic fixtures for Sonarr series, TMDB lookups, the Download
 * Station queue, and ntfy (logs instead of pushing).
 */

const MOCK_SERIES: SonarrSeries[] = [
  { id: 1, title: 'The Simpsons', tvdbId: 71663, year: 1989, path: 'T:\\TV Shows\\Animated\\The Simpsons', monitored: true, seriesType: 'standard', statistics: { seasonCount: 36, episodeFileCount: 760, totalEpisodeCount: 768 } },
  { id: 2, title: 'One Piece', tvdbId: 81797, year: 1999, path: 'T:\\TV Shows\\Animated\\One Piece', monitored: true, seriesType: 'anime', statistics: { seasonCount: 21, episodeFileCount: 1088, totalEpisodeCount: 1100 } },
  { id: 3, title: 'Severance', tvdbId: 371980, year: 2022, path: 'T:\\TV Shows\\Sci-Fi\\Severance', monitored: true, seriesType: 'standard', statistics: { seasonCount: 2, episodeFileCount: 18, totalEpisodeCount: 18 } },
];

export class MockSonarr implements SonarrAdapter {
  readonly name = 'sonarr';
  readonly mode = 'mock' as const;
  async ping() {
    return true;
  }
  async listSeries() {
    return MOCK_SERIES;
  }
  async listRootFolders(): Promise<SonarrRootFolder[]> {
    return [{ id: 1, path: 'T:\\TV Shows', accessible: true }];
  }
  async searchMissing(_seriesId: number) {
    /* mock: no-op */
  }
}

export class MockProwlarr implements ProwlarrAdapter {
  readonly name = 'prowlarr';
  readonly mode = 'mock' as const;
  async ping() {
    return true;
  }
  async indexerCount() {
    return 5;
  }
}

export class MockTmdb implements TmdbAdapter {
  readonly name = 'tmdb';
  readonly mode = 'mock' as const;
  async ping() {
    return true;
  }
  async searchMovie(title: string, year?: number): Promise<TmdbMovie | null> {
    // Deterministic fake id derived from the title so repeated scans are stable.
    const id = Array.from(title).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1_000_000, 7);
    return { id, title, release_date: year ? `${year}-01-01` : undefined, poster_path: `/${id}.jpg`, vote_average: 7.5 };
  }
  posterUrl(posterPath: string) {
    // In real mode this is https://image.tmdb.org/t/p/w500{path}; mock serves a placeholder.
    return `mock://poster${posterPath}`;
  }
}

export class MockDownloadStation implements DownloadStationAdapter {
  readonly name = 'downloadStation';
  readonly mode = 'mock' as const;
  private tasks: DownloadStatus[] = [
    { extId: 'ds-die-hard-3', title: 'Die Hard 3', state: 'downloading', dest: 'movies/Action', pct: 62, ts: 1_700_000_000_000 },
    { extId: 'ds-simpsons', title: 'The Simpsons S36E14', state: 'completed', dest: 'tv/Animated', pct: 100, ts: 1_700_000_000_000 },
  ];
  async ping() {
    return true;
  }
  async listTasks() {
    return this.tasks;
  }
  async addTask(url: string, dest: string) {
    const extId = `ds-${Math.abs(hash(url))}`;
    this.tasks.push({ extId, title: url.split('/').pop() ?? url, state: 'downloading', dest, pct: 0, ts: 1_700_000_000_000 });
    return extId;
  }
}

export class MockQbittorrent implements QbittorrentAdapter {
  readonly name = 'qbittorrent';
  readonly mode = 'mock' as const;
  async ping() {
    return true;
  }
  async listTasks(): Promise<DownloadStatus[]> {
    return [];
  }
  async addTask(url: string, category: string) {
    return `qb-${Math.abs(hash(url + category))}`;
  }
}

export class MockNtfy implements NtfyAdapter {
  readonly name = 'ntfy';
  readonly mode = 'mock' as const;
  /** Published messages are captured for tests / the Activity view in dev. */
  readonly outbox: Array<Pick<Notification, 'title' | 'event' | 'detail' | 'episode'>> = [];
  async ping() {
    return true;
  }
  async publish(n: Pick<Notification, 'title' | 'event' | 'detail' | 'episode'>) {
    this.outbox.push(n);
  }
}

function hash(s: string): number {
  return Array.from(s).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}
