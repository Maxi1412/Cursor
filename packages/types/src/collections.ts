import { z } from 'zod';
import { Mode, MediaType, Timestamp } from './common.js';

/**
 * `inventory/{mediaId}` — one owned title (movie or series), written by the scanner.
 * The library index Signal/Library/Deck all read from.
 */
export const InventoryItem = z.object({
  id: z.string(),
  mode: Mode,
  cat: z.string(),
  type: MediaType,
  title: z.string(),
  year: z.number().int().optional(),
  tmdbId: z.number().int().optional(),
  tvdbId: z.number().int().optional(),
  sonarrId: z.number().int().optional(),
  /** Absolute-ish library path, e.g. `T:\TV Shows\Animated\The Simpsons`. */
  path: z.string(),
  /** The largest video file under `path`, when resolved by a real scan — used by the corruption scan. */
  mainFile: z.string().optional(),
  /** Best quality present, e.g. `1080p`, `2160p`, `720p`. */
  quality: z.string().optional(),
  /** For series: which seasons are on disk. */
  seasonsOnDisk: z.array(z.number().int()).default([]),
  /** For series: count of missing (aired but not owned) episodes. */
  missingCount: z.number().int().nonnegative().default(0),
  /** Whether a Thai subtitle track is present in the folder. */
  subTH: z.boolean().default(false),
  /** Local (cached) poster URL served by the orchestrator, never a hot-linked TMDB URL. */
  posterUrl: z.string().optional(),
  lastScanned: Timestamp,
});
export type InventoryItem = z.infer<typeof InventoryItem>;

/** `health/{id}` — a library-health finding surfaced in Signal (flag-only). */
export const HealthKind = z.enum(['dup', 'corrupt', 'organize']);
export type HealthKind = z.infer<typeof HealthKind>;

export const HealthStatus = z.enum(['open', 'resolved', 'ignored']);
export type HealthStatus = z.infer<typeof HealthStatus>;

export const HealthFinding = z.object({
  id: z.string(),
  kind: HealthKind,
  title: z.string(),
  mode: Mode,
  cat: z.string(),
  /** Human-readable detail, e.g. "2 copies · 1080p + 2160p". */
  detail: z.string(),
  status: HealthStatus.default('open'),
  /** dup: the item to KEEP (best quality). corrupt/organize: the affected item. */
  mediaId: z.string().optional(),
  /** dup only: the other inventory ids in the group — these get recycled on resolve. */
  relatedIds: z.array(z.string()).default([]),
  /** organize only: the category the Move action relocates the item into. */
  expectedCat: z.string().optional(),
  ts: Timestamp,
});
export type HealthFinding = z.infer<typeof HealthFinding>;

/**
 * `deckMemory/{id}` — Deck's persistent conversation log (+ NAS backup).
 * `checked` are the provenance sources consulted for a grounded reply.
 */
export const DeckRole = z.enum(['user', 'ai']);
export type DeckRole = z.infer<typeof DeckRole>;

export const ProvenanceSource = z.enum(['Memory', 'Download Station', 'Library index', 'Files']);
export type ProvenanceSource = z.infer<typeof ProvenanceSource>;

/** An inline, confirm-before-execute action Deck can offer in chat. */
export const DeckAction = z.object({
  /** Button label, e.g. "Add the 3". */
  label: z.string(),
  /** Confirmation text shown after the action runs. */
  done: z.string(),
  /** The orchestrator action to invoke on confirm (gate-guarded). */
  tool: z.string().optional(),
  args: z.record(z.unknown()).optional(),
});
export type DeckAction = z.infer<typeof DeckAction>;

export const DeckMemory = z.object({
  id: z.string(),
  role: DeckRole,
  text: z.string(),
  checked: z.array(ProvenanceSource).default([]),
  action: DeckAction.optional(),
  ts: Timestamp,
});
export type DeckMemory = z.infer<typeof DeckMemory>;

/** `notifications/{id}` — the notification log mirrored to ntfy. */
export const NotificationEvent = z.enum([
  'grab',
  'new-episode',
  'scan',
  'missing',
  'claude',
  'subtitle',
  'upgrade',
  'new-release',
]);
export type NotificationEvent = z.infer<typeof NotificationEvent>;

export const Notification = z.object({
  id: z.string(),
  mediaId: z.string().optional(),
  title: z.string(),
  event: NotificationEvent,
  episode: z.string().optional(),
  detail: z.string().optional(),
  ts: Timestamp,
  delivered: z.boolean().default(false),
  seen: z.boolean().default(false),
});
export type Notification = z.infer<typeof Notification>;

/** `jobs/{id}` — the Claude Code desktop job queue. */
export const JobType = z.enum(['sort-files', 'match-episodes', 'add-torrent', 'custom']);
export type JobType = z.infer<typeof JobType>;

export const JobStatus = z.enum(['pending', 'claimed', 'running', 'done', 'failed']);
export type JobStatus = z.infer<typeof JobStatus>;

export const Job = z.object({
  id: z.string(),
  type: JobType,
  payload: z.record(z.unknown()),
  status: JobStatus.default('pending'),
  createdAt: Timestamp,
  updatedAt: Timestamp.optional(),
  claimedBy: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});
export type Job = z.infer<typeof Job>;

/** `downloadStatus/{extId}` — a mirror of the Download Station API. */
export const DownloadState = z.enum(['downloading', 'completed', 'failed', 'seeding', 'paused']);
export type DownloadState = z.infer<typeof DownloadState>;

export const DownloadStatus = z.object({
  extId: z.string(),
  title: z.string(),
  state: DownloadState,
  /** Destination folder the client reports (for Deck's "already in flight" checks). */
  dest: z.string().optional(),
  pct: z.number().min(0).max(100).default(0),
  ts: Timestamp,
});
export type DownloadStatus = z.infer<typeof DownloadStatus>;

/** `acknowledged/subsIgnored/{id}` and `acknowledged/organizeIgnored/{id}` — persisted ignore/lock lists. */
export const Acknowledgement = z.object({
  id: z.string(),
  value: z.literal(true),
  ts: Timestamp,
});
export type Acknowledgement = z.infer<typeof Acknowledgement>;
