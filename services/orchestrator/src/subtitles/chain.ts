import { writeSubtitle } from './writeSrt.js';

export interface SubtitleHit {
  url: string;
}

export interface SubtitleSource {
  name: string;
  mode: 'mock' | 'real';
  find(title: string, year?: number): Promise<SubtitleHit | null>;
}

export interface SubtitleResult {
  status: 'found' | 'unavailable';
  path?: string;
  sourceUsed?: string;
}

async function fetchContent(hit: SubtitleHit, mode: 'mock' | 'real'): Promise<string | null> {
  if (mode === 'mock') {
    return '1\n00:00:00,000 --> 00:00:02,000\n[mock Thai subtitle placeholder]\n';
  }
  try {
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Try each source in order (a fallback chain, spec §8); the first one that both finds a
 * hit AND yields real content wins. Writes the file to the SAME dir as the media, named
 * exactly `<title>.th.srt`. Returns 'unavailable' — never throws — when every source
 * comes up empty, so the caller can log it honestly instead of silently failing.
 */
export async function findAndWriteThaiSubtitle(
  sources: SubtitleSource[],
  title: string,
  year: number | undefined,
  destDir: string,
): Promise<SubtitleResult> {
  for (const source of sources) {
    const hit = await source.find(title, year).catch(() => null);
    if (!hit) continue;
    const content = await fetchContent(hit, source.mode);
    if (!content) continue;
    const path = await writeSubtitle(destDir, title, content);
    return { status: 'found', path, sourceUsed: source.name };
  }
  return { status: 'unavailable' };
}
