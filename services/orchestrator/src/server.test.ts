import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';

let app: FastifyInstance;
let close: () => Promise<void>;

beforeAll(async () => {
  process.env.STORAGE_BACKEND = 'sqlite';
  process.env.SQLITE_PATH = ':memory:';
  process.env.SCHEDULES_ENABLED = 'false';
  const built = await buildServer();
  app = built.app;
  close = () => built.ctx.storage.close();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await close();
});

async function json(method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: unknown) {
  const res = await app.inject({ method, url, payload });
  return { status: res.statusCode, body: res.json() };
}

describe('orchestrator API', () => {
  it('is healthy and seeds demo data', async () => {
    expect((await json('GET', '/health')).body).toEqual({ ok: true });
    const lib = await json('GET', '/api/library');
    expect(lib.body.items.length).toBeGreaterThan(0);
  });

  it('starts with every feature master OFF', async () => {
    const { body } = await json('GET', '/api/features');
    expect(Object.values(body.features).every((v) => v === false)).toBe(true);
  });

  it('gates Signal by the two-tier model: quality needs master AND category', async () => {
    // Rocky is 720p in movies:Action. Nothing shows until BOTH toggles are on.
    let signal = await json('GET', '/api/signal');
    expect(signal.body.upgrades).toHaveLength(0);

    await json('PUT', '/api/features/quality', { on: true }); // master only
    signal = await json('GET', '/api/signal');
    expect(signal.body.upgrades).toHaveLength(0); // still gated — no category

    await json('PUT', '/api/catcfg/movies/Action/quality', { on: true }); // category
    signal = await json('GET', '/api/signal');
    expect(signal.body.upgrades.some((u: { title: string }) => u.title === 'Rocky')).toBe(true);
  });

  it('projects Schedules from features × catCfg', async () => {
    const { body } = await json('GET', '/api/schedules');
    const quality = body.cards.find((c: { capability: string }) => c.capability === 'quality');
    expect(quality).toBeDefined();
    expect(quality.scopes.some((s: { label: string }) => s.label === 'Action · Movies')).toBe(true);
  });

  it('reports pending when a category is on but its master is off', async () => {
    await json('PUT', '/api/catcfg/tv/Animated/subs', { on: true }); // subs master still off
    const { body } = await json('GET', '/api/state');
    expect(body.pending['tv:Animated']).toContain('subs');
  });

  it('Deck answers with provenance chips (mock mode)', async () => {
    const { body } = await json('POST', '/api/deck/chat', { message: 'what action movies am I missing?' });
    expect(body.reply).toBeTruthy();
    expect(body.checked).toContain('Download Station');
    const mem = await json('GET', '/api/deck/memory');
    expect(mem.body.memory.length).toBeGreaterThanOrEqual(2); // user + ai turns persisted
  });

  it('accepts scanner inventory ingest (orchestrator is sole writer)', async () => {
    const item = {
      id: 'test-x',
      mode: 'movies',
      cat: 'Action',
      type: 'movie',
      title: 'Test Movie',
      path: 'M:\\Movies\\Action\\Test Movie',
      quality: '1080p',
      seasonsOnDisk: [],
      missingCount: 0,
      subTH: true,
      lastScanned: 0,
    };
    const res = await json('POST', '/api/inventory/bulk', { items: [item] });
    expect(res.body.written).toBe(1);
  });

  it('runs a capability on demand (gated internally)', async () => {
    const { body } = await json('POST', '/api/capabilities/dup/run');
    expect(body.result.key).toBe('dup');
  });

  it('enriches a series against Sonarr on ingest (missingCount + sonarrId)', async () => {
    await json('POST', '/api/inventory/bulk', {
      items: [
        {
          id: 'boys-test', mode: 'tv', cat: 'Comics', type: 'series', title: 'The Boys',
          path: 'T:\\TV Shows\\Comics\\The Boys', seasonsOnDisk: [4], missingCount: 0,
          subTH: false, lastScanned: 0,
        },
      ],
    });
    const lib = await json('GET', '/api/library?mode=tv');
    const boys = lib.body.items.find((i: { id: string }) => i.id === 'boys-test');
    expect(boys.missingCount).toBe(3); // mock Sonarr: 32 aired - 29 on disk
    expect(boys.sonarrId).toBe(4);
  });

  it('surfaces an aired-and-ready episode as a new signal (ungated, spec §3)', async () => {
    await json('POST', '/api/inventory/bulk', {
      items: [
        {
          id: 'simpsons-test', mode: 'tv', cat: 'Animated', type: 'series', title: 'The Simpsons',
          path: 'T:\\TV Shows\\Animated\\The Simpsons', seasonsOnDisk: [36], missingCount: 0,
          subTH: false, lastScanned: 0,
        },
      ],
    });
    // features are all off in this test's storage — new signals must still show (not gated).
    const { body } = await json('GET', '/api/signal');
    const signal = body.newSignals.find((s: { mediaId: string }) => s.mediaId === 'simpsons-test');
    expect(signal).toBeDefined();
    expect(signal.season).toBe(36);
    expect(signal.episode).toBe(14);
  });
});
