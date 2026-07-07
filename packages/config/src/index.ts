import { z } from 'zod';

/**
 * @mediadeck/config — the single place env is parsed and adapter modes are chosen.
 *
 * Design: every external system is `mock` unless explicitly set to `real` AND given
 * the credentials it needs. This is what lets the whole stack boot and be tested with
 * ZERO cloud credentials. Missing/partial real config downgrades to mock with a warning,
 * never a hard crash — a scaffold must always come up.
 */

const AdapterMode = z.enum(['mock', 'real']);
export type AdapterMode = z.infer<typeof AdapterMode>;

const StorageBackend = z.enum(['sqlite', 'firestore']);
export type StorageBackend = z.infer<typeof StorageBackend>;

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const RawEnv = z.object({
  NODE_ENV: z.string().default('development'),

  // ---- storage ----
  STORAGE_BACKEND: StorageBackend.default('sqlite'),
  SQLITE_PATH: z.string().default('./data/mediadeck.db'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),

  // ---- orchestrator server ----
  ORCH_HOST: z.string().default('0.0.0.0'),
  ORCH_PORT: z.coerce.number().int().default(4000),
  ORCH_PUBLIC_URL: z.string().default('http://localhost:4000'),
  POSTER_CACHE_DIR: z.string().default('./data/cache/posters'),

  // ---- media layout (TRaSH single-/data layout on the NAS) ----
  MEDIA_TV_PATH: z.string().default('./services/scanner/fixtures/media/tv'),
  MEDIA_MOVIES_PATH: z.string().default('./services/scanner/fixtures/media/movies'),
  DOWNLOADS_PATH: z.string().default('./services/scanner/fixtures/media/downloads'),

  // ---- adapters: mode + connection ----
  SONARR_MODE: AdapterMode.default('mock'),
  SONARR_URL: z.string().optional(),
  SONARR_API_KEY: z.string().optional(),

  PROWLARR_MODE: AdapterMode.default('mock'),
  PROWLARR_URL: z.string().optional(),
  PROWLARR_API_KEY: z.string().optional(),

  TMDB_MODE: AdapterMode.default('mock'),
  TMDB_READ_TOKEN: z.string().optional(),

  DOWNLOADSTATION_MODE: AdapterMode.default('mock'),
  DOWNLOADSTATION_URL: z.string().optional(),
  DOWNLOADSTATION_USER: z.string().optional(),
  DOWNLOADSTATION_PASS: z.string().optional(),

  QBITTORRENT_MODE: AdapterMode.default('mock'),
  QBITTORRENT_URL: z.string().optional(),
  QBITTORRENT_USER: z.string().optional(),
  QBITTORRENT_PASS: z.string().optional(),

  NTFY_MODE: AdapterMode.default('mock'),
  NTFY_URL: z.string().optional(),
  NTFY_TOPIC: z.string().optional(),

  // ---- Deck AI ----
  DECK_MODE: AdapterMode.default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
  DECK_MODEL: z.string().default('claude-sonnet-5'),

  // ---- auth ----
  AUTH_MODE: AdapterMode.default('mock'),
  FIREBASE_AUTH_ALLOWLIST: z.string().optional(), // comma-separated emails

  // ---- scheduling ----
  SCAN_CRON: z.string().default('0 * * * *'), // hourly
  CAPABILITY_CRON: z.string().default('*/30 * * * *'), // every 30 min
  SCHEDULES_ENABLED: bool(true),
});

export type RawEnv = z.infer<typeof RawEnv>;

export interface AdapterConfig {
  mode: AdapterMode;
  /** True when mode=real AND the minimum credentials are present. */
  ready: boolean;
}

export interface Config {
  nodeEnv: string;
  isProd: boolean;

  storage: {
    backend: StorageBackend;
    sqlitePath: string;
    firebaseProjectId?: string;
    firebaseServiceAccountPath?: string;
  };

  server: {
    host: string;
    port: number;
    publicUrl: string;
    posterCacheDir: string;
  };

  media: { tv: string; movies: string; downloads: string };

  adapters: {
    sonarr: AdapterConfig & { url?: string; apiKey?: string };
    prowlarr: AdapterConfig & { url?: string; apiKey?: string };
    tmdb: AdapterConfig & { readToken?: string };
    downloadStation: AdapterConfig & { url?: string; user?: string; pass?: string };
    qbittorrent: AdapterConfig & { url?: string; user?: string; pass?: string };
    ntfy: AdapterConfig & { url?: string; topic?: string };
    deck: AdapterConfig & { apiKey?: string; model: string };
    auth: AdapterConfig & { allowlist: string[] };
  };

  scheduling: { scanCron: string; capabilityCron: string; enabled: boolean };

  /** Warnings raised while resolving (e.g. "real requested but no key → mock"). */
  warnings: string[];
}

/**
 * Resolve an adapter's effective mode. If `real` is requested but the required
 * credentials are missing, downgrade to `mock` and record a warning.
 */
function resolveAdapter(
  name: string,
  requested: AdapterMode,
  hasCreds: boolean,
  warnings: string[],
): AdapterConfig {
  if (requested === 'real' && !hasCreds) {
    warnings.push(`${name}: mode=real but credentials missing — falling back to mock.`);
    return { mode: 'mock', ready: false };
  }
  return { mode: requested, ready: requested === 'real' && hasCreds };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = RawEnv.parse(env);
  const warnings: string[] = [];

  const allowlist = (e.FIREBASE_AUTH_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    nodeEnv: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',

    storage: {
      backend: e.STORAGE_BACKEND,
      sqlitePath: e.SQLITE_PATH,
      firebaseProjectId: e.FIREBASE_PROJECT_ID,
      firebaseServiceAccountPath: e.FIREBASE_SERVICE_ACCOUNT_PATH,
    },

    server: {
      host: e.ORCH_HOST,
      port: e.ORCH_PORT,
      publicUrl: e.ORCH_PUBLIC_URL,
      posterCacheDir: e.POSTER_CACHE_DIR,
    },

    media: { tv: e.MEDIA_TV_PATH, movies: e.MEDIA_MOVIES_PATH, downloads: e.DOWNLOADS_PATH },

    adapters: {
      sonarr: {
        ...resolveAdapter('sonarr', e.SONARR_MODE, !!(e.SONARR_URL && e.SONARR_API_KEY), warnings),
        url: e.SONARR_URL,
        apiKey: e.SONARR_API_KEY,
      },
      prowlarr: {
        ...resolveAdapter(
          'prowlarr',
          e.PROWLARR_MODE,
          !!(e.PROWLARR_URL && e.PROWLARR_API_KEY),
          warnings,
        ),
        url: e.PROWLARR_URL,
        apiKey: e.PROWLARR_API_KEY,
      },
      tmdb: {
        ...resolveAdapter('tmdb', e.TMDB_MODE, !!e.TMDB_READ_TOKEN, warnings),
        readToken: e.TMDB_READ_TOKEN,
      },
      downloadStation: {
        ...resolveAdapter(
          'downloadStation',
          e.DOWNLOADSTATION_MODE,
          !!(e.DOWNLOADSTATION_URL && e.DOWNLOADSTATION_USER),
          warnings,
        ),
        url: e.DOWNLOADSTATION_URL,
        user: e.DOWNLOADSTATION_USER,
        pass: e.DOWNLOADSTATION_PASS,
      },
      qbittorrent: {
        ...resolveAdapter(
          'qbittorrent',
          e.QBITTORRENT_MODE,
          !!e.QBITTORRENT_URL,
          warnings,
        ),
        url: e.QBITTORRENT_URL,
        user: e.QBITTORRENT_USER,
        pass: e.QBITTORRENT_PASS,
      },
      ntfy: {
        ...resolveAdapter('ntfy', e.NTFY_MODE, !!(e.NTFY_URL && e.NTFY_TOPIC), warnings),
        url: e.NTFY_URL,
        topic: e.NTFY_TOPIC,
      },
      deck: {
        ...resolveAdapter('deck', e.DECK_MODE, !!e.ANTHROPIC_API_KEY, warnings),
        apiKey: e.ANTHROPIC_API_KEY,
        model: e.DECK_MODEL,
      },
      auth: {
        ...resolveAdapter('auth', e.AUTH_MODE, allowlist.length > 0, warnings),
        allowlist,
      },
    },

    scheduling: {
      scanCron: e.SCAN_CRON,
      capabilityCron: e.CAPABILITY_CRON,
      enabled: e.SCHEDULES_ENABLED,
    },

    warnings,
  };
}
