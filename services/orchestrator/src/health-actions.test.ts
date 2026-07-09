import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLLECTIONS, type HealthFinding, type Job } from '@mediadeck/types';
import { buildServer } from './server.js';
import type { AppContext } from './context.js';

let app: FastifyInstance;
let ctx: AppContext;
let moviesRoot: string;

async function json(method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: unknown) {
  const res = await app.inject({ method, url, payload });
  return { status: res.statusCode, body: res.json() };
}

beforeAll(async () => {
  moviesRoot = await mkdtemp(join(tmpdir(), 'mediadeck-movies-'));
  process.env.STORAGE_BACKEND = 'sqlite';
  process.env.SQLITE_PATH = ':memory:';
  process.env.SCHEDULES_ENABLED = 'false';
  process.env.MEDIA_MOVIES_PATH = moviesRoot;
  const built = await buildServer();
  app = built.app;
  ctx = built.ctx;
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await ctx.storage.close();
  await rm(moviesRoot, { recursive: true, force: true });
  delete process.env.MEDIA_MOVIES_PATH;
});

describe('health-findings resolve actions (real files, recycle bin)', () => {
  it('dup resolve recycles the related copy and removes it from inventory', async () => {
    const keepDir = join(moviesRoot, 'Action', 'Rocky (1976)');
    const dupDir = join(moviesRoot, 'Anime', 'Rocky Duplicate (1976)');
    await mkdir(keepDir, { recursive: true });
    await mkdir(dupDir, { recursive: true });
    const keepFile = join(keepDir, 'Rocky - 1080p.mkv');
    const dupFile = join(dupDir, 'Rocky - 720p.mkv');
    await writeFile(keepFile, 'best-copy');
    await writeFile(dupFile, 'lower-copy');

    await json('POST', '/api/inventory/bulk', {
      items: [
        { id: 'rocky-keep', mode: 'movies', cat: 'Action', type: 'movie', title: 'Rocky Keep', path: keepFile, quality: '1080p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: 0 },
        { id: 'rocky-dup', mode: 'movies', cat: 'Anime', type: 'movie', title: 'Rocky Dup', path: dupFile, quality: '720p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: 0 },
      ],
    });

    const finding: HealthFinding = {
      id: 'dup-test-1', kind: 'dup', title: 'Rocky', mode: 'movies', cat: 'Action',
      detail: 'test duplicate', status: 'open', mediaId: 'rocky-keep', relatedIds: ['rocky-dup'], ts: 0,
    };
    await ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);

    const { body } = await json('POST', `/api/health-findings/${finding.id}/resolve`);
    expect(body.ok).toBe(true);
    expect(body.recycled).toEqual(['rocky-dup']);
    expect(body.skipped).toEqual([]);

    // the lower-quality copy is gone from its original spot...
    await expect(stat(dupFile)).rejects.toThrow();
    // ...but recoverable in the recycle bin, never hard-deleted
    const recycledFile = join(moviesRoot, '#recycle', 'Anime', 'Rocky Duplicate (1976)', 'Rocky - 720p.mkv');
    expect((await stat(recycledFile)).isFile()).toBe(true);
    // the kept copy is untouched
    expect((await stat(keepFile)).isFile()).toBe(true);
    // and the duplicate's inventory record is gone
    const remaining = await ctx.storage.getDoc(COLLECTIONS.inventory, 'rocky-dup');
    expect(remaining).toBeNull();

    const findingAfter = await ctx.storage.getDoc<HealthFinding>(COLLECTIONS.health, finding.id);
    expect(findingAfter?.status).toBe('resolved');
  });

  it('organize resolve moves the file into the expected category folder', async () => {
    const fromDir = join(moviesRoot, 'DC Movies', 'Deadpool (2024)');
    await mkdir(fromDir, { recursive: true });
    const fromFile = join(fromDir, 'Deadpool - 1080p.mkv');
    await writeFile(fromFile, 'deadpool-bytes');

    await json('POST', '/api/inventory/bulk', {
      items: [
        { id: 'deadpool-test', mode: 'movies', cat: 'DC Movies', type: 'movie', title: 'Deadpool', path: fromDir, quality: '1080p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: 0 },
      ],
    });

    const finding: HealthFinding = {
      id: 'org-test-1', kind: 'organize', title: 'Deadpool', mode: 'movies', cat: 'DC Movies',
      detail: 'studio suggests Marvel', status: 'open', mediaId: 'deadpool-test', relatedIds: [],
      expectedCat: 'Marvel Movies', ts: 0,
    };
    await ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);

    const { body } = await json('POST', `/api/health-findings/${finding.id}/resolve`);
    expect(body.ok).toBe(true);
    expect(body.skipped).toEqual([]);

    const movedFile = join(moviesRoot, 'Marvel Movies', 'Deadpool (2024)', 'Deadpool - 1080p.mkv');
    expect((await stat(movedFile)).isFile()).toBe(true);
    await expect(stat(fromFile)).rejects.toThrow(); // gone from the old folder — moved, not copied

    const item = await ctx.storage.getDoc<{ cat: string; path: string }>(COLLECTIONS.inventory, 'deadpool-test');
    expect(item?.cat).toBe('Marvel Movies');
  });

  it('corrupt resolve queues a bounded re-download job (never auto-acquires the file)', async () => {
    const finding: HealthFinding = {
      id: 'corrupt-test-1', kind: 'corrupt', title: 'John Wick 4', mode: 'movies', cat: 'Action',
      detail: 'no audio stream detected', status: 'open', relatedIds: [], ts: 0,
    };
    await ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);

    const { body } = await json('POST', `/api/health-findings/${finding.id}/resolve`);
    expect(body.ok).toBe(true);

    const jobs = await ctx.storage.queryDocs<Job>(COLLECTIONS.jobs);
    const job = jobs.find((j) => (j.payload as { query?: string }).query === 'John Wick 4');
    expect(job).toBeDefined();
    expect(job?.status).toBe('pending');
    expect(job?.type).toBe('add-torrent');
  });

  it('serves a cached poster after ingest and 404s for an unknown id', async () => {
    await json('POST', '/api/inventory/bulk', {
      items: [
        { id: 'poster-test', mode: 'movies', cat: 'Action', type: 'movie', title: 'Poster Test', path: moviesRoot, quality: '1080p', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: 0 },
      ],
    });
    const ok = await app.inject({ method: 'GET', url: '/api/posters/poster-test' });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-type']).toContain('image/png');

    const missing = await app.inject({ method: 'GET', url: '/api/posters/does-not-exist' });
    expect(missing.statusCode).toBe(404);
  });
});
