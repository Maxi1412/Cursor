import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import cron from 'node-cron';
import { loadConfig } from '@mediadeck/config';
import { runScan } from './scan.js';

/**
 * Default the media roots to the scanner's own bundled sample tree (absolute, so it
 * resolves no matter the cwd) unless MEDIA_* is set explicitly — e.g. to the NAS
 * `/data/media/...` paths in production. This is what makes `pnpm dev` work out of the box.
 */
function applyFixtureDefaults(): void {
  const here = dirname(fileURLToPath(import.meta.url)); // dist/ or src/
  const fixtures = join(here, '..', 'fixtures', 'media');
  const set = (key: string, sub: string) => {
    if (!process.env[key]) {
      const p = join(fixtures, sub);
      if (existsSync(p)) process.env[key] = p;
    }
  };
  set('MEDIA_TV_PATH', 'tv');
  set('MEDIA_MOVIES_PATH', 'movies');
  set('DOWNLOADS_PATH', 'downloads');
}

async function scanOnce(): Promise<void> {
  applyFixtureDefaults();
  const config = loadConfig();
  const started = Date.now();
  try {
    const res = await runScan(config, started);
    console.log(
      `[scanner] wrote ${res.written} items (${res.tv} TV, ${res.movies} movies) in ${Date.now() - started}ms → ${config.server.publicUrl}`,
    );
  } catch (err) {
    console.error('[scanner] scan failed:', (err as Error).message);
    if (process.argv.includes('--once')) process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  const config = loadConfig();
  await scanOnce();
  if (once) return;
  if (cron.validate(config.scheduling.scanCron)) {
    cron.schedule(config.scheduling.scanCron, scanOnce);
    console.log(`[scanner] scheduled: "${config.scheduling.scanCron}" (watching ${config.media.tv}, ${config.media.movies})`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) void main();
