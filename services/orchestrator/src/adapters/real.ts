import { z } from 'zod';
import {
  SonarrSeries,
  SonarrRootFolder,
  SonarrMissingResponse,
  TmdbSearchResult,
  TmdbMovieDetails,
  DsTask,
  QbTorrent,
  type DownloadState,
  type DownloadStatus,
  type Notification,
  type SonarrMissingRecord,
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
  async listMissing(): Promise<SonarrMissingRecord[]> {
    const q = new URLSearchParams({
      pageSize: '50',
      sortKey: 'airDateUtc',
      sortDirection: 'descending',
      includeSeries: 'true',
    });
    const data = await getJson(`${this.url}/api/v3/wanted/missing?${q}`, { headers: this.headers() });
    return SonarrMissingResponse.parse(data).records;
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
  async getMovieDetails(id: number): Promise<TmdbMovieDetails | null> {
    try {
      const data = await getJson(`https://api.themoviedb.org/3/movie/${id}`, { headers: this.headers() });
      return TmdbMovieDetails.parse(data);
    } catch {
      return null;
    }
  }
  posterUrl(posterPath: string) {
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
}

/** DSM's own task.status values -> our DownloadState. Unknown values default to "downloading". */
export function mapDsStatus(status: string): DownloadState {
  switch (status) {
    case 'finished':
      return 'completed';
    case 'seeding':
      return 'seeding';
    case 'paused':
      return 'paused';
    case 'error':
      return 'failed';
    default:
      return 'downloading'; // waiting, downloading, finishing, hash_checking, extracting, ...
  }
}

export function mapDsTask(t: z.infer<typeof DsTask>): DownloadStatus {
  const size = t.size ?? 0;
  const downloaded = t.additional?.transfer?.size_downloaded ?? 0;
  return {
    extId: t.id,
    title: t.title,
    state: mapDsStatus(t.status),
    dest: t.additional?.detail?.destination,
    pct: size > 0 ? Math.min(100, Math.round((downloaded / size) * 100)) : 0,
    ts: Date.now(),
  };
}

interface SynoEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: number };
}

/**
 * Synology Download Station (default download client, spec §7). Auth is a stateful
 * SYNO.API.Auth login -> SID, reused across calls and refreshed once on failure.
 *
 * DSM 7.2 quirk: log into DSM once as the exact user this connects as and set THAT
 * user's Download Station default destination, then pass a shared-folder-relative
 * `dest` here (no leading `/`) — otherwise task creation silently fails.
 */
export class RealDownloadStation implements DownloadStationAdapter {
  readonly name = 'downloadStation';
  readonly mode = 'real' as const;
  private sid: string | null = null;

  constructor(
    private url: string,
    private user: string,
    private pass: string,
  ) {}

  private async login(): Promise<string> {
    const q = new URLSearchParams({
      api: 'SYNO.API.Auth',
      version: '6',
      method: 'login',
      account: this.user,
      passwd: this.pass,
      session: 'DownloadStation',
      format: 'sid',
    });
    const data = (await getJson(`${this.url}/webapi/auth.cgi?${q}`)) as SynoEnvelope<{ sid: string }>;
    if (!data.success || !data.data?.sid) {
      throw new Error(`Download Station login failed (code ${data.error?.code ?? 'unknown'})`);
    }
    this.sid = data.data.sid;
    return this.sid;
  }

  private async call<T>(
    path: string,
    params: Record<string, string>,
    allowRetry = true,
  ): Promise<T> {
    const sid = this.sid ?? (await this.login());
    const q = new URLSearchParams({ ...params, _sid: sid });
    const data = (await getJson(`${this.url}${path}?${q}`)) as SynoEnvelope<T>;
    if (!data.success) {
      if (allowRetry) {
        this.sid = null;
        return this.call<T>(path, params, false);
      }
      throw new Error(`Download Station API error (code ${data.error?.code ?? 'unknown'})`);
    }
    return data.data as T;
  }

  async ping() {
    try {
      await this.login();
      return true;
    } catch {
      return false;
    }
  }

  async listTasks(): Promise<DownloadStatus[]> {
    const data = await this.call<{ tasks: unknown[] }>('/webapi/DownloadStation/task.cgi', {
      api: 'SYNO.DownloadStation.Task',
      version: '1',
      method: 'list',
      additional: 'detail,transfer',
    });
    return z.array(DsTask).parse(data.tasks ?? []).map(mapDsTask);
  }

  async addTask(url: string, dest: string): Promise<string> {
    await this.call('/webapi/DownloadStation/task.cgi', {
      api: 'SYNO.DownloadStation.Task',
      version: '1',
      method: 'create',
      uri: url,
      destination: dest.replace(/^\/+/, ''), // shared-folder-relative, no leading slash
    });
    return url; // Task.create doesn't return a task id synchronously
  }
}

/** qBittorrent's `state` values -> our DownloadState. Best-effort, documented mapping. */
export function mapQbState(state: string): DownloadState {
  if (state === 'error' || state === 'missingFiles') return 'failed';
  if (state === 'pausedUP') return 'completed'; // finished and not actively seeding
  if (state === 'pausedDL') return 'paused';
  if (state.endsWith('UP')) return 'seeding';
  return 'downloading';
}

export function mapQbTorrent(t: z.infer<typeof QbTorrent>): DownloadStatus {
  return {
    extId: t.hash,
    title: t.name,
    state: mapQbState(t.state),
    dest: t.save_path,
    pct: Math.round((t.progress ?? 0) * 100),
    ts: Date.now(),
  };
}

/** qBittorrent (fallback client, category `tv-sonarr`, spec §7). SID cookie auth. */
export class RealQbittorrent implements QbittorrentAdapter {
  readonly name = 'qbittorrent';
  readonly mode = 'real' as const;
  private cookie: string | null = null;

  constructor(
    private url: string,
    private user?: string,
    private pass?: string,
  ) {}

  private async login(): Promise<string> {
    const body = new URLSearchParams({ username: this.user ?? '', password: this.pass ?? '' });
    const res = await fetch(`${this.url}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = (await res.text()).trim();
    if (!res.ok || text !== 'Ok.') {
      throw new Error(`qBittorrent login failed: ${text || res.status}`);
    }
    const sid = res.headers.get('set-cookie')?.match(/SID=([^;]+)/)?.[1];
    if (!sid) throw new Error('qBittorrent login: no SID cookie returned');
    this.cookie = `SID=${sid}`;
    return this.cookie;
  }

  private async authedFetch(path: string, init: RequestInit = {}, allowRetry = true): Promise<Response> {
    const cookie = this.cookie ?? (await this.login());
    const res = await fetch(`${this.url}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Cookie: cookie },
    });
    if (res.status === 403 && allowRetry) {
      this.cookie = null;
      return this.authedFetch(path, init, false);
    }
    return res;
  }

  async ping() {
    try {
      await this.login();
      return true;
    } catch {
      return false;
    }
  }

  async listTasks(): Promise<DownloadStatus[]> {
    const res = await this.authedFetch('/api/v2/torrents/info');
    if (!res.ok) throw new Error(`qBittorrent torrents/info -> ${res.status}`);
    return z.array(QbTorrent).parse(await res.json()).map(mapQbTorrent);
  }

  async addTask(url: string, category: string): Promise<string> {
    const body = new URLSearchParams({ urls: url, category });
    const res = await this.authedFetch('/api/v2/torrents/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`qBittorrent torrents/add -> ${res.status}`);
    return url;
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
