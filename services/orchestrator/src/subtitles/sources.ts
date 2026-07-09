import type { SubtitleSource } from './chain.js';

function titleHash(s: string): number {
  return Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/**
 * Two deterministic mock sources forming a fallback chain: the first always misses (as a
 * real first-choice source often does), the second hits for most titles — exercising both
 * the "found" and the honest "unavailable" path with zero credentials.
 */
const mockSourceA: SubtitleSource = {
  name: 'mock-source-a',
  mode: 'mock',
  async find() {
    return null;
  },
};

const mockSourceB: SubtitleSource = {
  name: 'mock-source-b',
  mode: 'mock',
  async find(title) {
    return titleHash(title) % 5 === 0 ? null : { url: `mock://subs/${encodeURIComponent(title)}.th.srt` };
  },
};

export const MOCK_SUBTITLE_SOURCES: SubtitleSource[] = [mockSourceA, mockSourceB];

/**
 * OpenSubtitles REST API v1 (https://api.opensubtitles.com), filtered to Thai. Search is
 * implemented; the download step needs a second `/download` call to exchange a file_id
 * for a temporary signed URL — left as TODO(phase-8) pending a real API key to test
 * against, so this stays honest ("no hit") rather than a half-verified guess.
 */
export function createOpenSubtitlesSource(apiKey: string): SubtitleSource {
  return {
    name: 'opensubtitles',
    mode: 'real',
    async find(title, year) {
      try {
        const q = new URLSearchParams({ query: title, languages: 'th' });
        if (year) q.set('year', String(year));
        const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${q}`, {
          headers: { 'Api-Key': apiKey },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          data?: { attributes?: { files?: { file_id: number }[] } }[];
        };
        const hasResult = !!data.data?.[0]?.attributes?.files?.[0];
        // TODO(phase-8): POST /download with file_id -> { link } and return that as the hit.
        return hasResult ? null : null;
      } catch {
        return null;
      }
    },
  };
}
