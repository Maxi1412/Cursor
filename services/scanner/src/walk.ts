import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { InventoryItem, Mode } from '@mediadeck/types';

const RES_TOKENS = ['2160p', '1440p', '1080p', '720p', '480p'];
const RES_RANK: Record<string, number> = { '480p': 1, '720p': 2, '1080p': 3, '1440p': 4, '2160p': 5 };
const VIDEO_EXT = new Set(['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.ts']);

const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function dirs(p: string): string[] {
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function filesRecursive(p: string): string[] {
  if (!existsSync(p)) return [];
  const out: string[] = [];
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const full = join(p, e.name);
    if (e.isDirectory()) out.push(...filesRecursive(full));
    else out.push(e.name);
  }
  return out;
}

function videoFilesRecursive(p: string): string[] {
  if (!existsSync(p)) return [];
  const out: string[] = [];
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const full = join(p, e.name);
    if (e.isDirectory()) out.push(...videoFilesRecursive(full));
    else if (VIDEO_EXT.has(extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

/** The largest video file under a title's folder — the corruption scan probes this. */
function mainVideoFile(dir: string): string | undefined {
  const files = videoFilesRecursive(dir);
  if (!files.length) return undefined;
  let best = files[0]!;
  let bestSize = statSync(best).size;
  for (const f of files.slice(1)) {
    const size = statSync(f).size;
    if (size > bestSize) {
      best = f;
      bestSize = size;
    }
  }
  return best;
}

/** Best quality across a title's video files, defaulting to 1080p when unknown. */
function bestQuality(files: string[]): string {
  let best = '';
  for (const f of files) {
    for (const tok of RES_TOKENS) {
      if (f.includes(tok) && (RES_RANK[tok]! > (RES_RANK[best] ?? 0))) best = tok;
    }
  }
  return best || '1080p';
}

const hasThaiSub = (files: string[]) => files.some((f) => /\.th\.srt$/i.test(f));

/** Parse a trailing "(YYYY)" year and return the clean title. */
function parseTitleYear(dirName: string): { title: string; year?: number } {
  const m = dirName.match(/^(.*?)\s*\((\d{4})\)\s*$/);
  if (m) return { title: m[1]!.trim(), year: Number(m[2]) };
  return { title: dirName.trim() };
}

/** Walk the Movies library: <root>/<Category>/<Title (Year)>/<files>. */
export function walkMovies(root: string, now: number): InventoryItem[] {
  const items: InventoryItem[] = [];
  for (const cat of dirs(root)) {
    for (const titleDir of dirs(join(root, cat))) {
      const dir = join(root, cat, titleDir);
      const files = filesRecursive(dir);
      const { title, year } = parseTitleYear(titleDir);
      items.push({
        id: slug(title),
        mode: 'movies' as Mode,
        cat,
        type: 'movie',
        title,
        year,
        path: dir,
        mainFile: mainVideoFile(dir),
        quality: bestQuality(files),
        seasonsOnDisk: [],
        missingCount: 0,
        subTH: hasThaiSub(files),
        lastScanned: now,
      });
    }
  }
  return items;
}

/** Walk the TV library: <root>/<Category>/<Show>/<Season NN>/<files>. */
export function walkTv(root: string, now: number): InventoryItem[] {
  const items: InventoryItem[] = [];
  for (const cat of dirs(root)) {
    for (const showDir of dirs(join(root, cat))) {
      const dir = join(root, cat, showDir);
      const seasons = dirs(dir)
        .map((s) => s.match(/season\s*(\d+)/i)?.[1])
        .filter((n): n is string => !!n)
        .map(Number)
        .sort((a, b) => a - b);
      const files = filesRecursive(dir);
      items.push({
        id: slug(showDir),
        mode: 'tv' as Mode,
        cat,
        type: 'series',
        title: showDir,
        path: dir,
        mainFile: mainVideoFile(dir),
        quality: bestQuality(files),
        seasonsOnDisk: seasons,
        missingCount: 0, // filled by Sonarr resolution
        subTH: hasThaiSub(files),
        lastScanned: now,
      });
    }
  }
  return items;
}
