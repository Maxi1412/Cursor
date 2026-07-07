import { pathToFileURL } from 'node:url';
import { hostname } from 'node:os';
import type { Job } from '@mediadeck/types';
import { buildPrompt, runClaude } from './runner.js';

/**
 * MediaDeck Claude Code job poller (runs on the Windows desktop).
 *
 * The orchestrator (always-on, on the NAS) writes messy-judgment jobs to the `jobs` queue.
 * This watcher polls for pending jobs, and WHEN THE DESKTOP IS ON runs headless `claude -p`
 * with a scoped prompt + mapped-drive paths, then writes the result back. Jobs queue while
 * the desktop is off and execute on wake — that's why the always-on layer is the NAS.
 */

interface PollerConfig {
  orchestratorUrl: string;
  intervalMs: number;
  worker: string;
  mock: boolean;
  cli?: string;
}

function loadPollerConfig(): PollerConfig {
  const mock = process.env.POLLER_MODE !== 'real';
  return {
    orchestratorUrl: process.env.ORCH_PUBLIC_URL ?? 'http://192.168.0.100:4000',
    intervalMs: Number(process.env.POLLER_INTERVAL_MS ?? 15_000),
    worker: process.env.POLLER_WORKER ?? `desktop-${hostname()}`,
    mock,
    cli: process.env.CLAUDE_CLI,
  };
}

async function fetchPending(cfg: PollerConfig): Promise<Job[]> {
  const res = await fetch(`${cfg.orchestratorUrl}/api/jobs?status=pending`);
  if (!res.ok) throw new Error(`list jobs: ${res.status}`);
  return ((await res.json()) as { jobs: Job[] }).jobs;
}

async function claim(cfg: PollerConfig, id: string): Promise<void> {
  await fetch(`${cfg.orchestratorUrl}/api/jobs/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ worker: cfg.worker }),
  });
}

async function report(
  cfg: PollerConfig,
  id: string,
  body: { status: 'done' | 'failed'; result?: Record<string, unknown>; error?: string },
): Promise<void> {
  await fetch(`${cfg.orchestratorUrl}/api/jobs/${id}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function processOnce(cfg: PollerConfig): Promise<number> {
  const jobs = await fetchPending(cfg);
  for (const job of jobs) {
    await claim(cfg, job.id);
    const prompt = buildPrompt(job);
    const result = await runClaude(prompt, { mock: cfg.mock, cli: cfg.cli });
    await report(
      cfg,
      job.id,
      result.ok
        ? { status: 'done', result: { output: result.output } }
        : { status: 'failed', error: result.error ?? 'unknown error' },
    );
    console.log(`[poller] job ${job.id} (${job.type}) → ${result.ok ? 'done' : 'failed'}`);
  }
  return jobs.length;
}

async function main(): Promise<void> {
  const cfg = loadPollerConfig();
  console.log(
    `[poller] worker=${cfg.worker} mode=${cfg.mock ? 'mock' : 'real'} → ${cfg.orchestratorUrl} every ${cfg.intervalMs}ms`,
  );
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processOnce(cfg);
    } catch (e) {
      console.error('[poller]', (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, cfg.intervalMs));
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) void main();
