import { mkdir, rename, stat, copyFile, unlink } from 'node:fs/promises';
import { dirname, join, relative, isAbsolute, extname } from 'node:path';

/**
 * Universal safety rule (spec §8): every destructive action goes to the Recycle Bin,
 * never a hard delete; quality-upgrade swaps verify the new file before touching the
 * old one. This module is the ONE place that touches media files destructively —
 * every capability/route that removes or replaces a file goes through it.
 *
 * We reuse Synology's own convention: a `#recycle` folder at the library root mirroring
 * the original relative path, so recycled files show up exactly where DSM's own File
 * Station / Recycle Bin would show them, and stay recoverable from there too.
 */
const RECYCLE_DIR = '#recycle';

export interface RecycleResult {
  recycledTo: string;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Avoid clobbering an existing recycled copy — append a numeric suffix instead. */
async function dedupe(target: string): Promise<string> {
  let candidate = target;
  let n = 1;
  while (await exists(candidate)) {
    const ext = extname(candidate);
    const base = candidate.slice(0, candidate.length - ext.length);
    candidate = `${base}.${n}${ext}`;
    n++;
  }
  return candidate;
}

/** `rename` is atomic but fails with EXDEV across filesystems/volumes; fall back to copy+unlink. */
async function moveAcrossDevices(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFile(from, to);
      await unlink(from);
    } else {
      throw err;
    }
  }
}

/**
 * Move a file into `<libraryRoot>/#recycle/<relative path>`. Refuses to act on a path
 * outside the given library root (defense against a bad/absolute path reaching here).
 */
export async function moveToRecycleBin(libraryRoot: string, filePath: string): Promise<RecycleResult> {
  const rel = relative(libraryRoot, filePath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`refusing to recycle a path outside its library root: ${filePath}`);
  }
  const wanted = join(libraryRoot, RECYCLE_DIR, rel);
  await mkdir(dirname(wanted), { recursive: true });
  const target = await dedupe(wanted);
  await moveAcrossDevices(filePath, target);
  return { recycledTo: target };
}

export interface VerifyOptions {
  /** Minimum bytes to treat the file as complete rather than a stub/partial write. */
  minBytes?: number;
}

/** Is the new file actually present and non-trivial? Never assume — check. */
export async function verifyFileReady(path: string, opts: VerifyOptions = {}): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size >= (opts.minBytes ?? 1);
  } catch {
    return false;
  }
}

export interface SafeSwapParams {
  libraryRoot: string;
  oldPath: string;
  newPath: string;
  minBytes?: number;
}

export interface SafeSwapResult {
  ok: boolean;
  recycledTo?: string;
  reason?: string;
}

/**
 * Verify the new file is present and complete in the correct directory BEFORE touching
 * the old one; only then move the old file to the Recycle Bin. If verification fails,
 * keep BOTH files and report why — never create a gap (spec §8, quality upgrades).
 */
export async function safeSwap(params: SafeSwapParams): Promise<SafeSwapResult> {
  const ready = await verifyFileReady(params.newPath, { minBytes: params.minBytes });
  if (!ready) {
    return { ok: false, reason: `new file not present/complete at ${params.newPath}` };
  }
  const { recycledTo } = await moveToRecycleBin(params.libraryRoot, params.oldPath);
  return { ok: true, recycledTo };
}

/** A plain reorganization move (NOT a delete) — used by the organization-scan "Move" action. */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  await mkdir(dirname(toPath), { recursive: true });
  await moveAcrossDevices(fromPath, toPath);
}
