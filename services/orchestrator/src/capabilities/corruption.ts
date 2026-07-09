import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { COLLECTIONS, type HealthFinding } from '@mediadeck/types';
import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

type Spawner = (cmd: string, args: string[]) => ChildProcessWithoutNullStreams;
const defaultSpawn: Spawner = (cmd, args) => spawn(cmd, args) as ChildProcessWithoutNullStreams;

export interface ProbeResult {
  ok: boolean;
  reason?: string;
}

/**
 * Best-effort stream check via ffprobe: at least one audio stream, and a sane duration.
 * Catches "no sound" / truncated / unplayable in most cases — not exhaustive (spec §8).
 */
export function probeFile(filePath: string, spawnFn: Spawner = defaultSpawn): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawnFn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_type:format=duration',
        '-of',
        'json',
        filePath,
      ]);
    } catch {
      resolve({ ok: true, reason: 'ffprobe not available — skipped' });
      return;
    }
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (err += d));
    child.on('error', () => resolve({ ok: true, reason: 'ffprobe not available — skipped' }));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({ ok: false, reason: `ffprobe exited ${code}: ${err.trim().slice(0, 200) || 'no output'}` });
        return;
      }
      try {
        const parsed = JSON.parse(out) as {
          streams?: { codec_type: string }[];
          format?: { duration?: string };
        };
        const hasAudio = (parsed.streams ?? []).some((s) => s.codec_type === 'audio');
        const duration = Number(parsed.format?.duration ?? 0);
        if (!hasAudio) {
          resolve({ ok: false, reason: 'no audio stream detected' });
        } else if (!duration || duration < 1) {
          resolve({ ok: false, reason: 'zero/invalid duration — likely truncated' });
        } else {
          resolve({ ok: true });
        }
      } catch {
        resolve({ ok: false, reason: 'unreadable ffprobe output — file may be broken' });
      }
    });
  });
}

function ffprobeAvailable(spawnFn: Spawner = defaultSpawn): Promise<boolean> {
  return new Promise((resolve) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawnFn('ffprobe', ['-version']);
    } catch {
      resolve(false);
      return;
    }
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

export const corruption: CapabilityModule = {
  key: 'corrupt',
  cadence: 'Weekly',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('corrupt');
    const items = scopedItems(rc, 'corrupt').filter((i) => !!i.mainFile);
    const skippedNoFile = scopedItems(rc, 'corrupt').length - items.length;
    res.considered = items.length;

    if (!(await ffprobeAvailable())) {
      res.notes.push(
        'ffprobe is not installed in this environment — corruption scan skipped honestly (it runs in the Docker image, which bundles ffmpeg).',
      );
      return res;
    }

    const now = Date.now();
    for (const item of items) {
      const result = await probeFile(item.mainFile!);
      if (result.ok) continue;
      const finding: HealthFinding = {
        id: `corrupt:${item.id}`,
        kind: 'corrupt',
        title: item.title,
        mode: item.mode,
        cat: item.cat,
        detail: result.reason ?? 'stream check failed',
        status: 'open',
        mediaId: item.id,
        relatedIds: [],
        ts: now,
      };
      await rc.ctx.storage.setDoc(COLLECTIONS.health, finding.id, finding);
      res.flagged++;
    }
    res.notes.push(
      `${res.flagged} file(s) flagged by ffprobe (best-effort — catches most but not all cases).` +
        (skippedNoFile ? ` ${skippedNoFile} item(s) skipped — no resolved media file yet.` : ''),
    );
    return res;
  },
};
