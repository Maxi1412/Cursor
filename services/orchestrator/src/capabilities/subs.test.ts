import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteStorage, ACK_COLLECTIONS } from '@mediadeck/storage';
import { ALL_OFF, COLLECTIONS, type FeatureState, type InventoryItem } from '@mediadeck/types';
import type { CatCfgMap } from '@mediadeck/core';
import { subs } from './subs.js';
import type { RunContext } from './base.js';
import type { AppContext } from '../context.js';

let root: string;
let storage: SqliteStorage;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mediadeck-subs-cap-'));
  storage = new SqliteStorage(':memory:');
});
afterEach(async () => {
  await storage.close();
  await rm(root, { recursive: true, force: true });
});

function ctxFor(): AppContext {
  return {
    config: { adapters: { subtitles: { mode: 'mock' } } } as unknown as AppContext['config'],
    storage,
    adapters: {} as AppContext['adapters'],
    log: () => {},
  };
}

const features: FeatureState = { ...ALL_OFF, subs: true };
const catCfg: CatCfgMap = { 'tv:All': { ...ALL_OFF, subs: true } };

async function makeItem(id: string, title: string): Promise<InventoryItem> {
  const dir = join(root, title);
  await mkdir(dir, { recursive: true });
  return {
    id, mode: 'tv', cat: 'Animated', type: 'series', title, path: dir,
    seasonsOnDisk: [1], missingCount: 0, subTH: false, lastScanned: 0,
  };
}

describe('subs capability', () => {
  it('writes .th.srt for titles a mock source finds, and updates subTH', async () => {
    // "The Simpsons" deterministically hits mock-source-b (hash % 5 !== 0).
    const item = await makeItem('simpsons', 'The Simpsons');
    const ctx = ctxFor();
    const rc: RunContext = { ctx, features, catCfg, inventory: [item] };

    const res = await subs.run(rc);
    expect(res.flagged).toBe(1);
    expect((await stat(join(item.path, 'The Simpsons.th.srt'))).isFile()).toBe(true);
    const updated = await ctx.storage.getDoc<InventoryItem>(COLLECTIONS.inventory, 'simpsons');
    expect(updated?.subTH).toBe(true);
  });

  it('never re-searches an ignored title, and honestly counts unavailable ones', async () => {
    const other = await makeItem('other-1', 'Some Other Show');
    const ignoredItem = await makeItem('ignored-1', 'Ignored Show');
    await ctx_setIgnored(storage, 'ignored-1');

    const ctx = ctxFor();
    const rc: RunContext = { ctx, features, catCfg, inventory: [other, ignoredItem] };
    const res = await subs.run(rc);

    // the ignored item's folder must stay untouched — no subtitle written
    const files = await listDir(ignoredItem.path);
    expect(files).toEqual([]);
    expect(res.considered).toBe(2); // both are "in scope" for the gate...
    expect(res.notes.join(' ')).toMatch(/1 ignored, skipped/); // ...but only 1 was searched
  });

  it('respects the two-tier gate — items outside the enabled scope are never touched', async () => {
    const outOfScope = await makeItem('oos-1', 'Out Of Scope Show');
    const ctx = ctxFor();
    const rc: RunContext = {
      ctx, features, catCfg: { 'tv:SomeOtherCategory': { ...ALL_OFF, subs: true } },
      inventory: [{ ...outOfScope, cat: 'Animated' }],
    };
    const res = await subs.run(rc);
    expect(res.considered).toBe(0);
    expect(await listDir(outOfScope.path)).toEqual([]);
  });
});

async function ctx_setIgnored(storage: SqliteStorage, mediaId: string): Promise<void> {
  await storage.setDoc(ACK_COLLECTIONS.subsIgnored, mediaId, { id: mediaId, value: true, ts: 0 });
}

async function listDir(dir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  return readdir(dir);
}
