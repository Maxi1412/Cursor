import { z } from 'zod';
import {
  SonarrSeries,
  SonarrRootFolder,
  TmdbSearchResult,
  type DownloadStatus,
  type Notification,
  type TmdbMovie,
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
 * Real HTTP adapters. Sonarr/TMDB/ntfy are simple API-key/topic calls and are
 * implemented. The Download Station and qBittorrent clients need a stateful login
 * dance (Synology SYNO.API.Auth / qBt SID cookie) — the request plumbing is here and
 * the session flow is marked TODO(phase-7) to finish against a live NAS.
 */

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} -> ${res.status}`);
  return res.json();
}

export class RealSonarr implements SonarrAdapter {
  readonly name = 'sonarr';
  readonly mode = 'real' as const;
  constructor(
    private url: string,
    private apiKey: string,
  ) {}
  private headers() {
    return { 'X-Api-Key': this.apiKey };
  }
  async ping() {
    try {
      await getJson(`${this.url}/api/v3/system/status`, { headers: this.headers() });
      return true;
    } catch {
      return false;
    }
  }
  async listSeries() {
    const data = await getJson(`${this.url}/api/v3/series`, { headers: this.headers() });
    return z.array(SonarrSeries).parse(data);
  }
  async listRootFolders() {
    const data = await getJson(`${this.url}/api/v3/rootfolder`, { headers: this.headers() });
    return z.array(SonarrRootFolder).parse(data);
  }
  async searchMissing(seriesId: number) {
    await fetch(`${this.url}/api/v3/command`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SeriesSearch', seriesId }),
    });
  }
}

export class RealProwlarr implements ProwlarrAdapter {
  readonly name = 'prowlarr';
  readonly mode = 'real' as const;
  constructor(
    private url: string,
    private apiKey: string,
  ) {}
  async ping() {
    try {
      await getJson(`${this.url}/api/v1/system/status`, { headers: { 'X-Api-Key': this.apiKey } });
      return true;
    } catch {
      return false;
    }
  }
  async indexerCount() {
    const data = (await getJson(`${this.url}/api/v1/indexer`, {
      headers: { 'X-Api-Key': this.apiKey },
    })) as unknown[];
    return Array.isArray(data) ? data.length : 0;
  }
}

export class RealTmdb implements TmdbAdapter {
  readonly name = 'tmdb';
  readonly mode = 'real' as const;
  constructor(private readToken: string) {}
  private headers() {
    return { Authorization: `Bearer ${this.readToken}`, accept: 'application/json' };
  }
  async ping() {
    try {
      await getJson('https://api.themoviedb.org/3/authentication', { headers: this.headers() });
      return true;
    } catch {
      return false;
    }
  }
  async searchMovie(title: string, year?: number): Promise<TmdbMovie | null> {
    const q = new URLSearchParams({ query: title });
    if (year) q.set('year', String(year));
    const data = await getJson(`https://api.themoviedb.org/3/search/movie?${q}`, {
      headers: this.headers(),
    });
    return TmdbSearchResult.parse(data).results[0] ?? null;
  }
  posterUrl(posterPath: string) {
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
}

export class RealDownloadStation implements DownloadStationAdapter {
  readonly name = 'downloadStation';
  readonly mode = 'real' as const;
  constructor(
    private url: string,
    private user: string,
    private pass: string,
  ) {}
  // TODO(phase-7): implement SYNO.API.Auth login → SID, then SYNO.DownloadStation.Task.
  // Remember the DSM 7.2 "no default destination" quirk: set the Sonarr user's DS default
  // location and pass the shared-folder-relative dest (no leading slash). See spec §7.
  async ping() {
    try {
      const info = (await getJson(
        `${this.url}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.DownloadStation.Task`,
      )) as { success?: boolean };
      return info?.success === true;
    } catch {
      return false;
    }
  }
  async listTasks(): Promise<DownloadStatus[]> {
    return []; // TODO(phase-7): map SYNO.DownloadStation.Task.list -> DownloadStatus[]
  }
  async addTask(_url: string, _dest: string): Promise<string> {
    // TODO(phase-7): SYNO.API.Auth login with this.user/this.pass, then Task.create.
    throw new Error(`RealDownloadStation.addTask not implemented (phase-7); user=${this.user ? 'set' : 'unset'}, pass=${this.pass ? 'set' : 'unset'}`);
  }
}

export class RealQbittorrent implements QbittorrentAdapter {
  readonly name = 'qbittorrent';
  readonly mode = 'real' as const;
  constructor(
    private url: string,
    private user?: string,
    private pass?: string,
  ) {}
  // TODO(phase-7): /api/v2/auth/login for the SID cookie, then /torrents/info + /torrents/add.
  async ping() {
    try {
      const res = await fetch(`${this.url}/api/v2/app/version`);
      return res.ok;
    } catch {
      return false;
    }
  }
  async listTasks(): Promise<DownloadStatus[]> {
    return [];
  }
  async addTask(_url: string, _category: string): Promise<string> {
    // TODO(phase-7): /api/v2/auth/login with this.user/this.pass for the SID cookie, then add.
    throw new Error(`RealQbittorrent.addTask not implemented (phase-7); auth=${this.user && this.pass ? 'user+pass' : 'none'}`);
  }
}

export class RealNtfy implements NtfyAdapter {
  readonly name = 'ntfy';
  readonly mode = 'real' as const;
  constructor(
    private url: string,
    private topic: string,
  ) {}
  async ping() {
    try {
      const res = await fetch(`${this.url}/v1/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
  async publish(n: Pick<Notification, 'title' | 'event' | 'detail' | 'episode'>) {
    const body = [n.episode, n.detail].filter(Boolean).join(' · ') || n.event;
    await fetch(`${this.url}/${this.topic}`, {
      method: 'POST',
      headers: { Title: n.title, Tags: n.event },
      body,
    });
  }
}
