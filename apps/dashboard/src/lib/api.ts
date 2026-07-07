import type {
  Capability,
  CapabilityFlags,
  DeckAction,
  DeckMemory,
  FeatureMeta,
  HealthFinding,
  InventoryItem,
  Mode,
  Notification,
  ProvenanceSource,
  DownloadStatus,
} from '@mediadeck/types';

/** Base URL of the orchestrator REST API. */
export const ORCH_URL = import.meta.env.VITE_ORCH_URL ?? 'http://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Response shapes (mirror services/orchestrator/src/routes.ts)      */
/* ------------------------------------------------------------------ */

export interface SystemChip {
  key: string;
  label: string;
  ok: boolean;
  mode: 'mock' | 'real';
}
export interface SystemResponse {
  nas: boolean;
  storage: string;
  chips: SystemChip[];
  warnings: string[];
}

export interface FeaturesResponse {
  features: CapabilityFlags;
}

export type CatCfgMap = Record<string, CapabilityFlags>;
export interface CatCfgResponse {
  catCfg: CatCfgMap;
}

export interface StateResponse {
  features: CapabilityFlags;
  catCfg: CatCfgMap;
  pending: Record<string, Capability[]>;
}

export interface LibraryResponse {
  items: InventoryItem[];
}

export interface CollectionCat {
  name: string;
  n: number;
}
export interface CollectionSection {
  total: number;
  cats: CollectionCat[];
}
export interface CollectionResponse {
  total: number;
  movies: CollectionSection;
  tv: CollectionSection;
  subCoverage: { have: number; total: number };
}

export interface SignalResponse {
  needsAttention: {
    missing: InventoryItem[];
    subsMissing: InventoryItem[];
  };
  upgrades: InventoryItem[];
  newSignals: InventoryItem[];
  releases: InventoryItem[];
  health: HealthFinding[];
}

export interface ScheduleScope {
  key: string;
  mode: Mode;
  cat: string;
  label: string;
}
export interface ScheduleCard {
  capability: Capability;
  meta: FeatureMeta;
  scopes: ScheduleScope[];
}
export interface SchedulesResponse {
  cards: ScheduleCard[];
}

export interface DownloadsResponse {
  downloads: DownloadStatus[];
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface HealthFindingsResponse {
  findings: HealthFinding[];
}

export interface DeckChatResponse {
  reply: string;
  checked: ProvenanceSource[];
  action?: DeckAction;
  thinkingNote: string;
}

export interface DeckMemoryResponse {
  memory: DeckMemory[];
}

/* ------------------------------------------------------------------ */
/*  Thin fetch wrappers                                                */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ORCH_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}
function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Prefix a relative poster path (e.g. `/api/posters/<id>`) with the orchestrator origin. */
export function posterSrc(posterUrl: string | undefined): string | undefined {
  if (!posterUrl) return undefined;
  if (/^https?:\/\//.test(posterUrl)) return posterUrl;
  return `${ORCH_URL}${posterUrl}`;
}

export const api = {
  system: () => get<SystemResponse>('/api/system'),
  features: () => get<FeaturesResponse>('/api/features'),
  setFeature: (key: Capability, on: boolean) =>
    send<FeaturesResponse>('PUT', `/api/features/${key}`, { on }),
  catCfg: () => get<CatCfgResponse>('/api/catcfg'),
  setCatCfg: (mode: Mode, cat: string, key: Capability, on: boolean) =>
    send<{ scope: string; cfg: CapabilityFlags }>(
      'PUT',
      `/api/catcfg/${mode}/${encodeURIComponent(cat)}/${key}`,
      { on },
    ),
  state: () => get<StateResponse>('/api/state'),
  library: (mode: Mode) => get<LibraryResponse>(`/api/library?mode=${mode}`),
  collection: () => get<CollectionResponse>('/api/collection'),
  signal: () => get<SignalResponse>('/api/signal'),
  schedules: () => get<SchedulesResponse>('/api/schedules'),
  downloads: () => get<DownloadsResponse>('/api/downloads'),
  notifications: () => get<NotificationsResponse>('/api/notifications'),
  healthFindings: () => get<HealthFindingsResponse>('/api/health-findings'),
  healthAction: (id: string, action: 'ignore' | 'resolve') =>
    send<{ ok: boolean }>('POST', `/api/health-findings/${id}/${action}`),
  ignoreSubs: (mediaId: string) =>
    send<{ ok: boolean }>('POST', `/api/subs/${encodeURIComponent(mediaId)}/ignore`),
  unignoreSubs: (mediaId: string) =>
    send<{ ok: boolean }>('DELETE', `/api/subs/${encodeURIComponent(mediaId)}/ignore`),
  deckChat: (message: string) => send<DeckChatResponse>('POST', '/api/deck/chat', { message }),
  deckMemory: () => get<DeckMemoryResponse>('/api/deck/memory'),
  clearDeckMemory: () => send<{ ok: boolean }>('DELETE', '/api/deck/memory'),
};
