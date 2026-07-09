import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findAndWriteThaiSubtitle, type SubtitleSource } from './chain.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mediadeck-subs-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const missSource: SubtitleSource = { name: 'miss', mode: 'mock', async find() { return null; } };
const hitSource: SubtitleSource = {
  name: 'hit', mode: 'mock',
  async find(title) { return { url: `mock://${title}` }; },
};

describe('Thai subtitle fetch chain', () => {
  it('falls through misses to the next source and writes the exact filename', async () => {
    const res = await findAndWriteThaiSubtitle([missSource, hitSource], 'The Simpsons', 1989, dir);
    expect(res.status).toBe('found');
    expect(res.sourceUsed).toBe('hit');
    const expected = join(dir, 'The Simpsons.th.srt');
    expect(res.path).toBe(expected);
    expect((await stat(expected)).isFile()).toBe(true);
    expect(await readFile(expected, 'utf8')).toContain('placeholder');
  });

  it('is honest about "unavailable" when every source misses — never throws', async () => {
    const res = await findAndWriteThaiSubtitle([missSource, missSource], 'Obscure Title', undefined, dir);
    expect(res.status).toBe('unavailable');
    expect(res.path).toBeUndefined();
  });

  it('tolerates a source that throws — treats it as a miss and keeps going', async () => {
    const throwing: SubtitleSource = {
      name: 'broken', mode: 'mock',
      async find() { throw new Error('network down'); },
    };
    const res = await findAndWriteThaiSubtitle([throwing, hitSource], 'Rocky', 1976, dir);
    expect(res.status).toBe('found');
    expect(res.sourceUsed).toBe('hit');
  });
});
