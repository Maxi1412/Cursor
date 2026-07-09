import { readFile } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ALL_OFF,
  ACK_LISTS,
  COLLECTIONS,
  Capability,
  InventoryItem as InventoryItemSchema,
  Job as JobSchema,
  Mode,
  scopeKey,
  type CategoryConfig,
  type DownloadStatus,
  type HealthFinding,
  type InventoryItem,
  type Job,
  type Notification,
} from '@mediadeck/types';
import { isEnabled, isPending, projectSchedule } from '@mediadeck/core';
import { ACK_COLLECTIONS } from '@mediadeck/storage';
import type { AppContext } from './context.js';
import { loadState, loadFeatures, saveFeatures } from './state.js';
import { runCapability, runEnabledCapabilities } from './capabilities/index.js';
import { deckChat, loadMemory, clearMemory } from './deck/agent.js';
import { moveToRecycleBin, moveFile } from './safety/recycle.js';
import { cachePoster, posterFilePath } from './media/posterCache.js';
import { buildSonarrIndex, matchSonarrSeries, missingCountFor } from './media/sonarrMatch.js';

const RES_RANK: Record<string, number> = { '480p': 1, '720p': 2, '1080p': 3, '1440p': 4, '2160p': 5 };
const now = () => Date.now();

function libraryRootFor(ctx: AppContext, mode: Mode): string {
  return mode === 'tv' ? ctx.config.media.tv : ctx.config.media.movies;
}

export async function registerRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { storage, adapters } = ctx;

  /* ------------------------------- system ------------------------------- */
  app.get('/health', async () => ({ ok: true }));

  app.get('/api/system', async () => {
    const [sonarr, prowlarr, tmdb, ds, ntfy] = await Promise.all([
      adapters.sonarr.ping(),
      adapters.prowlarr.ping(),
      adapters.tmdb.ping(),
      adapters.downloadStation.ping(),
      adapters.ntfy.ping(),
    ]);
    return {
      nas: true,
      storage: storage.backend,
      chips: [
        { key: 'sonarr', label: 'Sonarr', ok: sonarr, mode: adapters.sonarr.mode },
        { key: 'prowlarr', label: 'Prowlarr', ok: prowlarr, mode: adapters.prowlarr.mode },
        { key: 'downloadStation', label: 'Download Station', ok: ds, mode: adapters.downloadStation.mode },
        { key: 'tmdb', label: 'TMDB', ok: tmdb, mode: adapters.tmdb.mode },
        { key: 'deck', label: 'Claude API', ok: ctx.config.adapters.deck.mode === 'real', mode: ctx.config.adapters.deck.mode },
        { key: 'ntfy', label: 'ntfy push', ok: ntfy, mode: adapters.ntfy.mode },
      ],
      warnings: ctx.config.warnings,
    };
  });

  /* ---------------------------- feature masters ---------------------------- */
  app.get('/api/features', async () => ({ features: await loadFeatures(storage) }));

  app.put('/api/features/:key', async (req) => {
    const key = Capability.parse((req.params as { key: string }).key);
    const body = z.object({ on: z.boolean() }).parse(req.body);
    const features = await loadFeatures(storage);
    features[key] = body.on;
    await saveFeatures(storage, features);
    return { features };
  });

  /* --------------------------- category config ---------------------------- */
  app.get('/api/catcfg', async () => {
    const { catCfg } = await loadState(storage);
    return { catCfg };
  });

  // Toggle a single capability for a scope (`{mode}:{cat}`), writing catCfg directly.
  app.put('/api/catcfg/:mode/:cat/:key', async (req) => {
    const p = req.params as { mode: string; cat: string; key: string };
    const mode = Mode.parse(p.mode);
    const cap = Capability.parse(p.key);
    const body = z.object({ on: z.boolean() }).parse(req.body);
    const key = scopeKey(mode, decodeURIComponent(p.cat));
    const existing = (await storage.getDoc<CategoryConfig>(COLLECTIONS.catCfg, key)) ?? { ...ALL_OFF };
    const next = { ...ALL_OFF, ...existing, [cap]: body.on };
    await storage.setDoc(COLLECTIONS.catCfg, key, next);
    return { scope: key, cfg: next };
  });

  /* -------------------------------- library ------------------------------- */
  app.get('/api/library', async (req) => {
    const query = req.query as { mode?: string };
    let items = await storage.queryDocs<InventoryItem>(COLLECTIONS.inventory);
    if (query.mode) {
      const mode = Mode.parse(query.mode);
      items = items.filter((i) => i.mode === mode);
    }
    return { items };
  });

  app.get('/api/collection', async () => {
    const items = await storage.queryDocs<InventoryItem>(COLLECTIONS.inventory);
    const summarize = (mode: Mode) => {
      const scoped = items.filter((i) => i.mode === mode);
      const byCat: Record<string, number> = {};
      for (const i of scoped) byCat[i.cat] = (byCat[i.cat] ?? 0) + 1;
      return {
        total: scoped.length,
        cats: Object.entries(byCat).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n),
      };
    };
    const withSubs = items.filter((i) => i.subTH).length;
    return {
      total: items.length,
      movies: summarize('movies'),
      tv: summarize('tv'),
      subCoverage: { have: withSubs, total: items.length },
    };
  });

  // Scanner ingest — the orchestrator is the SOLE storage writer for inventory. It also
  // owns TMDB enrichment + local poster caching so the scanner stays dumb-and-fast and
  // the browser never talks to TMDB directly.
  app.post('/api/inventory/bulk', async (req) => {
    const body = z.object({ items: z.array(InventoryItemSchema) }).parse(req.body);
    const sonarrIndex = body.items.some((i) => i.type === 'series')
      ? buildSonarrIndex(await adapters.sonarr.listSeries().catch(() => []))
      : null;

    for (const it of body.items) {
      await storage.setDoc(COLLECTIONS.inventory, it.id, it);

      if (it.type === 'movie') {
        // Orchestrator owns TMDB enrichment + local poster caching (keeps the scanner
        // dumb-and-fast; the browser never talks to TMDB directly). TV poster/TMDB
        // enrichment is out of scope this pass.
        try {
          const found = await adapters.tmdb.searchMovie(it.title, it.year);
          const posterUrl = await cachePoster(
            ctx.config.server.posterCacheDir,
            adapters.tmdb,
            it.id,
            found?.poster_path,
          );
          const patch: Partial<InventoryItem> = { tmdbId: found?.id ?? it.tmdbId };
          if (posterUrl) patch.posterUrl = posterUrl;
          await storage.updateDoc(COLLECTIONS.inventory, it.id, patch);
        } catch (err) {
          ctx.log('poster/TMDB enrichment failed', { id: it.id, error: (err as Error).message });
        }
      } else if (it.type === 'series' && sonarrIndex) {
        const match = matchSonarrSeries(sonarrIndex, it.title);
        if (match) {
          await storage.updateDoc(COLLECTIONS.inventory, it.id, {
            sonarrId: match.id,
            tvdbId: match.tvdbId,
            missingCount: missingCountFor(match),
          });
        }
      }
    }
    return { written: body.items.length };
  });

  /* --------------------------------- posters ------------------------------- */
  app.get('/api/posters/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const buf = await readFile(posterFilePath(ctx.config.server.posterCacheDir, id));
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.type('image/png').send(buf);
    } catch {
      return reply.code(404).send({ error: 'no cached poster' });
    }
  });

  /* -------------------------------- signal -------------------------------- */
  // The "what needs me" feed = the two-tier intersection of features × catCfg.
  app.get('/api/signal', async () => {
    const { features, catCfg } = await loadState(storage);
    const items = await storage.queryDocs<InventoryItem>(COLLECTIONS.inventory);
    const health = await storage.queryDocs<HealthFinding>(COLLECTIONS.health);
    const subsIgnored = new Set((await storage.queryDocs(ACK_COLLECTIONS.subsIgnored)).map((d) => d.id));

    // Missing episodes + missing Thai subs are facts, not gated (subs respect the ignore list).
    const needsAttention = {
      missing: items.filter((i) => i.missingCount > 0),
      subsMissing: items.filter((i) => !i.subTH && !subsIgnored.has(i.id)),
    };

    const upgrades = features.quality
      ? items.filter(
          (i) =>
            (RES_RANK[i.quality ?? ''] ?? 3) < RES_RANK['1080p']! &&
            isEnabled('quality', i.mode, i.cat, features, catCfg),
        )
      : [];

    const healthShown = health.filter(
      (h) => h.status === 'open' && isEnabled(h.kind, h.mode, h.cat, features, catCfg),
    );

    // New signals = aired-but-not-downloaded episodes from Sonarr. Spec §3: "Always
    // shown — aired episodes are facts, not gated" (unlike releases/upgrades/health).
    const bySonarrId = new Map(items.filter((i) => i.sonarrId != null).map((i) => [i.sonarrId, i]));
    const missingEpisodes = await adapters.sonarr.listMissing().catch(() => []);
    const nowMs = now();
    const RECENT_MS = 14 * 24 * 3600_000;
    const newSignals = missingEpisodes
      .map((m) => {
        if (!m.airDateUtc) return null;
        const airedAt = new Date(m.airDateUtc).getTime();
        if (Number.isNaN(airedAt) || airedAt > nowMs || nowMs - airedAt > RECENT_MS) return null;
        const item = bySonarrId.get(m.seriesId);
        if (!item) return null;
        return {
          mediaId: item.id,
          title: item.title,
          mode: item.mode,
          cat: item.cat,
          posterUrl: item.posterUrl,
          season: m.seasonNumber,
          episode: m.episodeNumber,
          airedAt: m.airDateUtc,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      needsAttention,
      upgrades,
      newSignals,
      // TODO(phase-7): releases (gated) from TMDB theatrical->physical/digital windows.
      releases: [],
      health: healthShown,
    };
  });

  /* ------------------------------- schedules ------------------------------ */
  app.get('/api/schedules', async () => {
    const { features, catCfg } = await loadState(storage);
    return { cards: projectSchedule(features, catCfg) };
  });

  /* ------------------------------- downloads ------------------------------ */
  app.get('/api/downloads', async () => {
    const mirror = await storage.queryDocs<DownloadStatus>(COLLECTIONS.downloadStatus);
    const live = await adapters.downloadStation.listTasks().catch(() => []);
    return { downloads: live.length ? live : mirror };
  });

  /* ----------------------------- notifications ---------------------------- */
  app.get('/api/notifications', async () => {
    const notes = await storage.queryDocs<Notification>(COLLECTIONS.notifications);
    return { notifications: notes.sort((a, b) => b.ts - a.ts) };
  });

  /* ----------------------------- health actions --------------------------- */
  app.get('/api/health-findings', async () => {
    const health = await storage.queryDocs<HealthFinding>(COLLECTIONS.health);
    return { findings: health.filter((h) => h.status === 'open') };
  });

  app.post('/api/health-findings/:id/:action', async (req) => {
    const p = req.params as { id: string; action: string };
    const finding = await storage.getDoc<HealthFinding>(COLLECTIONS.health, p.id);
    if (!finding) return { ok: false, error: 'not found' };

    if (p.action === 'ignore') {
      if (finding.kind === 'organize') {
        // "Ignore = lock in place" — persist so it never re-flags (spec §8).
        await storage.setDoc(`acknowledged/${ACK_LISTS.organizeIgnored}`, finding.mediaId ?? finding.id, {
          id: finding.mediaId ?? finding.id,
          value: true,
          ts: now(),
        });
      }
      await storage.updateDoc(COLLECTIONS.health, p.id, { status: 'ignored' });
      return { ok: true };
    }

    // action === 'resolve' — the actual remediation, universal safety rule: recycle
    // bin, never hard-delete; verify-before-swap already lives in safety/recycle.ts.
    const root = libraryRootFor(ctx, finding.mode);
    const recycled: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    if (finding.kind === 'dup') {
      for (const relatedId of finding.relatedIds) {
        const item = await storage.getDoc<InventoryItem>(COLLECTIONS.inventory, relatedId);
        if (!item) {
          skipped.push({ id: relatedId, reason: 'inventory item not found' });
          continue;
        }
        try {
          await moveToRecycleBin(root, item.path);
          await storage.deleteDoc(COLLECTIONS.inventory, item.id);
          recycled.push(item.id);
        } catch (err) {
          skipped.push({ id: relatedId, reason: (err as Error).message });
        }
      }
    } else if (finding.kind === 'corrupt') {
      // No automated release search here (that's Sonarr/Prowlarr's job) — queue a
      // bounded job so the re-download is tracked, honest about not auto-acquiring it.
      const jobId = `job-${now()}-${Math.round(Math.random() * 1e6)}`;
      const job: Job = {
        id: jobId,
        type: 'add-torrent',
        payload: { query: finding.title, dest: `${finding.mode}/${finding.cat}`, reason: 'corruption re-download' },
        status: 'pending',
        createdAt: now(),
      };
      await storage.setDoc(COLLECTIONS.jobs, jobId, job);
    } else if (finding.kind === 'organize' && finding.mediaId && finding.expectedCat) {
      const item = await storage.getDoc<InventoryItem>(COLLECTIONS.inventory, finding.mediaId);
      if (item) {
        // Reconstruct <root>/<newCat>/<titleDir> — matches the scanner's folder convention.
        const newPath = join(dirname(dirname(item.path)), finding.expectedCat, basename(item.path));
        try {
          await moveFile(item.path, newPath);
          await storage.updateDoc(COLLECTIONS.inventory, item.id, { path: newPath, cat: finding.expectedCat });
        } catch (err) {
          skipped.push({ id: item.id, reason: (err as Error).message });
        }
      }
    }

    await storage.updateDoc(COLLECTIONS.health, p.id, { status: 'resolved' });
    return { ok: true, recycled, skipped };
  });

  /* ---------------------------- subtitle ignore --------------------------- */
  app.post('/api/subs/:mediaId/ignore', async (req) => {
    const { mediaId } = req.params as { mediaId: string };
    await storage.setDoc(ACK_COLLECTIONS.subsIgnored, mediaId, { id: mediaId, value: true, ts: now() });
    return { ok: true };
  });
  app.delete('/api/subs/:mediaId/ignore', async (req) => {
    const { mediaId } = req.params as { mediaId: string };
    await storage.deleteDoc(ACK_COLLECTIONS.subsIgnored, mediaId);
    return { ok: true };
  });

  /* ------------------------------ capabilities ---------------------------- */
  app.post('/api/capabilities/:key/run', async (req) => {
    const key = Capability.parse((req.params as { key: string }).key);
    return { result: await runCapability(ctx, key) };
  });
  app.post('/api/capabilities/run-all', async () => ({ results: await runEnabledCapabilities(ctx) }));

  /* --------------------------------- jobs --------------------------------- */
  // The Claude Code desktop queue. Poller claims pending jobs and writes results back.
  app.get('/api/jobs', async (req) => {
    const query = req.query as { status?: string };
    let jobs = await storage.queryDocs<Job>(COLLECTIONS.jobs);
    if (query.status) jobs = jobs.filter((j) => j.status === query.status);
    return { jobs: jobs.sort((a, b) => a.createdAt - b.createdAt) };
  });

  app.post('/api/jobs', async (req) => {
    const body = JobSchema.pick({ type: true, payload: true }).parse(req.body);
    const id = `job-${now()}-${Math.round(Math.random() * 1e6)}`;
    const job: Job = { id, type: body.type, payload: body.payload, status: 'pending', createdAt: now() };
    await storage.setDoc(COLLECTIONS.jobs, id, job);
    return { job };
  });

  app.post('/api/jobs/:id/claim', async (req) => {
    const { id } = req.params as { id: string };
    const by = z.object({ worker: z.string() }).parse(req.body);
    await storage.updateDoc(COLLECTIONS.jobs, id, { status: 'running', claimedBy: by.worker, updatedAt: now() });
    return { ok: true };
  });

  app.post('/api/jobs/:id/result', async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({ status: z.enum(['done', 'failed']), result: z.record(z.unknown()).optional(), error: z.string().optional() }).parse(req.body);
    await storage.updateDoc(COLLECTIONS.jobs, id, { ...body, updatedAt: now() });
    // TODO(phase-9): fire ntfy on job completion.
    return { ok: true };
  });

  /* --------------------------------- deck --------------------------------- */
  app.post('/api/deck/chat', async (req) => {
    const body = z.object({ message: z.string().min(1) }).parse(req.body);
    return deckChat(ctx, body.message, now());
  });
  app.get('/api/deck/memory', async () => ({ memory: await loadMemory(storage) }));
  app.delete('/api/deck/memory', async () => {
    await clearMemory(storage);
    return { ok: true };
  });

  /* ------------------------ two-tier state (combined) --------------------- */
  // Handy single call the PWA uses to render Settings pending states.
  app.get('/api/state', async () => {
    const { features, catCfg } = await loadState(storage);
    const pending: Record<string, Capability[]> = {};
    for (const [key, flags] of Object.entries(catCfg)) {
      const [mode, cat] = key.split(':') as [Mode, string];
      const caps = (Object.keys(flags) as Capability[]).filter(
        (c) => flags[c] && isPending(c, mode, cat, features, catCfg),
      );
      if (caps.length) pending[key] = caps;
    }
    return { features, catCfg, pending };
  });
}
