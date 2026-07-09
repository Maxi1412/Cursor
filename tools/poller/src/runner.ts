import { spawn } from 'node:child_process';
import type { Job } from '@mediadeck/types';

/**
 * Turn a job into a bounded, scoped prompt for headless Claude Code. Jobs must stay
 * bounded (sort THIS folder, match THESE files) — never hand it the whole library.
 */
export function buildPrompt(job: Job): string {
  const p = job.payload as Record<string, unknown>;
  switch (job.type) {
    case 'sort-files':
      return `Sort the media files in the folder "${p.folder}" into correctly-named show/movie folders. Only touch files in that folder. Report the moves you made.`;
    case 'match-episodes':
      return `These files may be the same episode: ${JSON.stringify(p.files)}. Determine which are duplicates/which episode each is, using TMDB naming. Report your matching; do not delete anything.`;
    case 'add-torrent':
      return `Find and add a torrent for "${p.query}" to Download Station in the "${p.dest}" directory. Only add a genuine Blu-ray/WEB release, never a cam/telesync rip.`;
    default:
      return String(p.prompt ?? 'No prompt provided.');
  }
}

export interface RunResult {
  ok: boolean;
  output: string;
  error?: string;
}

/**
 * Invoke headless Claude Code (`claude -p`). Auth via CLAUDE_CODE_OAUTH_TOKEN
 * (subscription) or ANTHROPIC_API_KEY. In mock mode (or when the CLI is absent) returns a
 * simulated result so the queue loop is testable without the desktop/CLI.
 */
export async function runClaude(prompt: string, opts: { mock: boolean; cli?: string }): Promise<RunResult> {
  if (opts.mock) {
    return { ok: true, output: `[mock] would run: ${prompt.slice(0, 80)}…` };
  }
  const cli = opts.cli ?? 'claude';
  return new Promise((resolve) => {
    const child = spawn(cli, ['-p', prompt, '--allowedTools', 'Read,Edit,Bash'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => resolve({ ok: false, output: out, error: e.message }));
    child.on('close', (code) =>
      resolve({ ok: code === 0, output: out.trim(), error: code === 0 ? undefined : err.trim() }),
    );
  });
}
