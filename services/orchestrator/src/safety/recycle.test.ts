import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moveToRecycleBin, verifyFileReady, safeSwap, moveFile } from './recycle.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mediadeck-recycle-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('recycle bin safety', () => {
  it('moves a file into #recycle mirroring its relative path', async () => {
    const dir = join(root, 'Action', 'Rocky (1976)');
    await mkdir(dir, { recursive: true });
    const file = join(dir, 'Rocky (1976) - 720p.mkv');
    await writeFile(file, 'video-bytes');

    const { recycledTo } = await moveToRecycleBin(root, file);
    expect(recycledTo).toBe(join(root, '#recycle', 'Action', 'Rocky (1976)', 'Rocky (1976) - 720p.mkv'));
    expect(await readFile(recycledTo, 'utf8')).toBe('video-bytes');
    await expect(stat(file)).rejects.toThrow(); // original is gone from the library
  });

  it('never overwrites an existing recycled copy — disambiguates instead', async () => {
    const file = join(root, 'a.mkv');
    await writeFile(file, 'first');
    await moveToRecycleBin(root, file);

    await writeFile(file, 'second'); // a new file lands at the same original path
    const { recycledTo } = await moveToRecycleBin(root, file);
    expect(recycledTo).not.toBe(join(root, '#recycle', 'a.mkv'));
    expect(await readFile(recycledTo, 'utf8')).toBe('second');
    expect(await readFile(join(root, '#recycle', 'a.mkv'), 'utf8')).toBe('first');
  });

  it('refuses to recycle a path outside the library root', async () => {
    await expect(moveToRecycleBin(root, '/etc/passwd')).rejects.toThrow(/outside its library root/);
  });

  it('verifyFileReady is honest about missing/empty/present files', async () => {
    expect(await verifyFileReady(join(root, 'nope.mkv'))).toBe(false);
    const empty = join(root, 'empty.mkv');
    await writeFile(empty, '');
    expect(await verifyFileReady(empty)).toBe(false); // 0 bytes never "ready"
    const real = join(root, 'real.mkv');
    await writeFile(real, 'x'.repeat(10));
    expect(await verifyFileReady(real, { minBytes: 5 })).toBe(true);
    expect(await verifyFileReady(real, { minBytes: 100 })).toBe(false);
  });

  it('safeSwap recycles the old file ONLY after the new one verifies', async () => {
    const oldFile = join(root, 'Movie - 720p.mkv');
    await writeFile(oldFile, 'old');
    const newFile = join(root, 'Movie - 2160p.mkv');
    await writeFile(newFile, 'new-bigger-file');

    const res = await safeSwap({ libraryRoot: root, oldPath: oldFile, newPath: newFile });
    expect(res.ok).toBe(true);
    expect(res.recycledTo).toContain('#recycle');
    await expect(stat(oldFile)).rejects.toThrow();
    expect(await stat(newFile)).toBeTruthy(); // the new file stays in place, untouched
  });

  it('safeSwap keeps BOTH files and reports why when verification fails — never a gap', async () => {
    const oldFile = join(root, 'Movie - 720p.mkv');
    await writeFile(oldFile, 'old');
    const missingNewFile = join(root, 'Movie - 2160p.mkv'); // never actually landed

    const res = await safeSwap({ libraryRoot: root, oldPath: oldFile, newPath: missingNewFile });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not present\/complete/);
    expect(await stat(oldFile)).toBeTruthy(); // old file untouched — no gap created
  });

  it('moveFile relocates without deleting (organization-scan Move action)', async () => {
    const from = join(root, 'DC Movies', 'Deadpool.mkv');
    await mkdir(join(root, 'DC Movies'), { recursive: true });
    await writeFile(from, 'content');
    const to = join(root, 'Marvel Movies', 'Deadpool.mkv');

    await moveFile(from, to);
    expect(await readFile(to, 'utf8')).toBe('content');
    await expect(stat(from)).rejects.toThrow();
  });
});
