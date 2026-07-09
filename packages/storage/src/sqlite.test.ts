import { describe, it, expect, afterEach } from 'vitest';
import { SqliteStorage } from './sqlite.js';
import { seedFixtures, ACK_COLLECTIONS } from './seed.js';
import { CAPABILITIES } from '@mediadeck/types';
import type { StorageProvider } from './provider.js';

let store: StorageProvider | undefined;
afterEach(async () => {
  await store?.close();
  store = undefined;
});

describe('SqliteStorage', () => {
  it('round-trips set/get/update/delete', async () => {
    store = new SqliteStorage(':memory:');
    await store.setDoc('inventory', 'a', { id: 'a', title: 'Alpha', n: 1 });
    expect(await store.getDoc('inventory', 'a')).toMatchObject({ title: 'Alpha', n: 1 });

    await store.updateDoc('inventory', 'a', { n: 2 });
    expect(await store.getDoc('inventory', 'a')).toMatchObject({ title: 'Alpha', n: 2 });

    await store.deleteDoc('inventory', 'a');
    expect(await store.getDoc('inventory', 'a')).toBeNull();
  });

  it('always stamps the document id', async () => {
    store = new SqliteStorage(':memory:');
    await store.setDoc('jobs', 'j1', { type: 'sort-files' } as any);
    expect(await store.getDoc('jobs', 'j1')).toMatchObject({ id: 'j1', type: 'sort-files' });
  });

  it('queries with an equality filter', async () => {
    store = new SqliteStorage(':memory:');
    await store.setDoc('health', 'h1', { id: 'h1', kind: 'dup', mode: 'movies' });
    await store.setDoc('health', 'h2', { id: 'h2', kind: 'corrupt', mode: 'movies' });
    await store.setDoc('health', 'h3', { id: 'h3', kind: 'dup', mode: 'tv' });
    const dups = await store.queryDocs('health', { kind: 'dup' });
    expect(dups.map((d) => d.id).sort()).toEqual(['h1', 'h3']);
  });

  it('supports sub-list collection paths', async () => {
    store = new SqliteStorage(':memory:');
    await store.setDoc(ACK_COLLECTIONS.subsIgnored, 'severance', { id: 'severance', value: true });
    expect(await store.getDoc(ACK_COLLECTIONS.subsIgnored, 'severance')).toMatchObject({
      value: true,
    });
    // isolated from the other list
    expect(await store.queryDocs(ACK_COLLECTIONS.organizeIgnored)).toEqual([]);
  });

  it('watch fires on change', async () => {
    store = new SqliteStorage(':memory:', 20);
    const seen: number[] = [];
    const unsub = store.watch('notifications', (docs) => seen.push(docs.length));
    expect(seen).toEqual([0]); // immediate fire with current (empty) state
    await store.setDoc('notifications', 'n1', { id: 'n1', title: 'x' });
    await new Promise((r) => setTimeout(r, 60));
    expect(seen[seen.length - 1]).toBe(1);
    unsub();
  });

  it('seeds fixtures with all feature masters OFF', async () => {
    store = new SqliteStorage(':memory:');
    await seedFixtures(store);
    const features = (await store.getDoc('features', 'state'))!;
    expect(CAPABILITIES.every((cap) => features[cap] === false)).toBe(true);
    expect((await store.queryDocs('inventory')).length).toBeGreaterThan(0);
    expect((await store.queryDocs('health')).length).toBe(3);
  });
});
