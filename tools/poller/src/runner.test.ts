import { describe, it, expect } from 'vitest';
import { buildPrompt, runClaude } from './runner.js';
import type { Job } from '@mediadeck/types';

const job = (type: Job['type'], payload: Record<string, unknown>): Job => ({
  id: 'j1',
  type,
  payload,
  status: 'pending',
  createdAt: 0,
});

describe('poller runner', () => {
  it('builds bounded, scoped prompts per job type', () => {
    expect(buildPrompt(job('sort-files', { folder: 'D:\\Downloads\\x' }))).toContain('D:\\Downloads\\x');
    expect(buildPrompt(job('add-torrent', { query: 'Furiosa', dest: 'movies/Action' }))).toContain('cam/telesync');
    expect(buildPrompt(job('custom', { prompt: 'hello' }))).toBe('hello');
  });

  it('runs in mock mode without invoking the CLI', async () => {
    const res = await runClaude('do a thing', { mock: true });
    expect(res.ok).toBe(true);
    expect(res.output).toContain('[mock]');
  });
});
