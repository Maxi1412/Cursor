import type {
  DownloadStatus,
  Notification,
  SonarrMissingRecord,
  SonarrRootFolder,
  SonarrSeries,
  TmdbMovie,
  TmdbMovieDetails,
} from '@mediadeck/types';

/** Every adapter reports its effective mode and a reachability check for the System chips. */
export interface Adapter {
  readonly name: string;
  readonly mode: 'mock' | 'real';
  ping(): Promise<boolean>;
}

export interface SonarrAdapter extends Adapter {
  listSeries(): Promise<SonarrSeries[]>;
  listRootFolders(): Promise<SonarrRootFolder[]>;
  /** Aired-but-not-downloaded episodes — the source for Signal's "New signals" feed. */
  listMissing(): Promise<SonarrMissingRecord[]>;
  /** Trigger a search for a series' missing (wanted) episodes. */
  searchMissing(seriesId: number): Promise<void>;
}

export interface ProwlarrAdapter extends Adapter {
  indexerCount(): Promise<number>;
}

export interface TmdbAdapter extends Adapter {
  searchMovie(title: string, year?: number): Promise<TmdbMovie | null>;
  /** Full details incl. production companies — used by the organization scan. */
  getMovieDetails(id: number): Promise<TmdbMovieDetails | null>;
  /** Build a poster URL from a TMDB poster_path (adapter owns the base + size). */
  posterUrl(posterPath: string): string;
}

export interface DownloadStationAdapter extends Adapter {
  listTasks(): Promise<DownloadStatus[]>;
  /** Add a download; returns the external task id. `dest` is the shared-folder-relative dir. */
  addTask(url: string, dest: string): Promise<string>;
}

export interface QbittorrentAdapter extends Adapter {
  listTasks(): Promise<DownloadStatus[]>;
  addTask(url: string, category: string): Promise<string>;
}

export interface NtfyAdapter extends Adapter {
  publish(n: Pick<Notification, 'title' | 'event' | 'detail' | 'episode'>): Promise<void>;
}

export interface Adapters {
  sonarr: SonarrAdapter;
  prowlarr: ProwlarrAdapter;
  tmdb: TmdbAdapter;
  downloadStation: DownloadStationAdapter;
  qbittorrent: QbittorrentAdapter;
  ntfy: NtfyAdapter;
}
