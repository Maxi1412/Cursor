import { describe, it, expect } from 'vitest';
import { SqliteStorage } from '@mediadeck/storage';
import { ALL_OFF, type FeatureState, type InventoryItem, type TmdbMovieDetails } from '@mediadeck/types';
import type { CatCfgMap } from '@mediadeck/core';
import { organize } from './organize.js';
import type { AppContext } from '../context.js';
import type { RunContext } from './base.js';
import type { Adapters } from '../adapters/index.js';

function fakeCtx(getDetails: (id: number) => Promise<TmdbMovieDetails | null>): AppContext {
  const storage = new SqliteStorage(':memory:');
  return {
    config: {} as AppContext['config'],
    storage,
    adapters: {
      tmdb: {
        name: 'tmdb',
        mode: 'real',
        async ping() {
          return true;
        },
        async searchMovie() {
          return null;
        },
        getMovieDetails: getDetails,
        posterUrl: (p: string) => p,
      },
    } as unknown as Adapters,
    log: () => {},
  };
}

const item = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: 'x', mode: 'movies', cat: 'DC Movies', type: 'movie', title: 'Deadpool', tmdbId: 42,
  path: '/x', seasonsOnDisk: [], missingCount: 0, subTH: false, lastScanned: 0, ...overrides,
});

const featuresOn: FeatureState = { ...ALL_OFF, organize: true };
const catCfg: CatCfgMap = { 'movies:All': { ...ALL_OFF, organize: true } };

describe('organize capability', () => {
  it('flags a mismatch: category says DC but the studio is Marvel', async () => {
    const ctx = fakeCtx(async () => ({
      id: 42, title: 'Deadpool', production_companies: [{ id: 1, name: 'Marvel Studios' }], genres: [],
    }));
    const rc: RunContext = { ctx, features: featuresOn, catCfg, inventory: [item({})] };
    const res = await organize.run(rc);
    expect(res.flagged).toBe(1);
    const findings = await ctx.storage.queryDocs('health');
    expect(findings).toHaveLength(1);
    expect((findings[0] as any).expectedCat).toBe('Marvel Movies');
    expect((findings[0] as any).detail).toContain('Marvel');
  });

  it('does not flag when the studio matches the category', async () => {
    const ctx = fakeCtx(async () => ({
      id: 42, title: 'The Batman', production_companies: [{ id: 1, name: 'DC Studios' }], genres: [],
    }));
    const rc: RunContext = { ctx, features: featuresOn, catCfg, inventory: [item({ title: 'The Batman' })] };
    const res = await organize.run(rc);
    expect(res.flagged).toBe(0);
  });

  it('skips categories with no known studio expectation', async () => {
    const ctx = fakeCtx(async () => ({ id: 42, title: 'x', production_companies: [], genres: [] }));
    const rc: RunContext = {
      ctx, features: featuresOn, catCfg,
      inventory: [item({ cat: 'Horror Movies' })],
    };
    const res = await organize.run(rc);
    expect(res.flagged).toBe(0);
  });

  it('never re-flags a locked (ignored) item', async () => {
    const ctx = fakeCtx(async () => ({
      id: 42, title: 'Deadpool', production_companies: [{ id: 1, name: 'Marvel Studios' }], genres: [],
    }));
    await ctx.storage.setDoc('acknowledged/organizeIgnored', 'x', { id: 'x', value: true, ts: 0 });
    const rc: RunContext = { ctx, features: featuresOn, catCfg, inventory: [item({})] };
    const res = await organize.run(rc);
    expect(res.flagged).toBe(0);
  });

  it('is honest and no-ops entirely when TMDB is in mock mode', async () => {
    const ctx = fakeCtx(async () => ({ id: 42, title: 'x', production_companies: [], genres: [] }));
    (ctx.adapters.tmdb as { mode: string }).mode = 'mock';
    const rc: RunContext = { ctx, features: featuresOn, catCfg, inventory: [item({})] };
    const res = await organize.run(rc);
    expect(res.flagged).toBe(0);
    expect(res.notes.join(' ')).toMatch(/mock mode/);
  });
});
