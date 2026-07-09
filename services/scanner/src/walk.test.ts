import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { walkMovies, walkTv } from './walk.js';

const here = dirname(fileURLToPath(import.meta.url));
const MEDIA = join(here, '..', 'fixtures', 'media');

describe('scanner walk', () => {
  it('walks the movie library, parsing year, quality and Thai subs', () => {
    const items = walkMovies(join(MEDIA, 'movies'), 0);
    const dune = items.find((i) => i.title === 'Dune Part Two');
    expect(dune).toBeDefined();
    expect(dune!.year).toBe(2024);
    expect(dune!.quality).toBe('2160p');
    expect(dune!.subTH).toBe(true);
    expect(dune!.mode).toBe('movies');

    const rocky = items.find((i) => i.title === 'Rocky');
    expect(rocky!.quality).toBe('720p'); // below-1080p, a quality-upgrade candidate
    expect(rocky!.subTH).toBe(false);

    // Dark Knight has 1080p + 2160p files -> best quality wins (2160p)
    const tdk = items.find((i) => i.title === 'The Dark Knight');
    expect(tdk!.quality).toBe('2160p');
  });

  it('walks the TV library, collecting seasons on disk', () => {
    const items = walkTv(join(MEDIA, 'tv'), 0);
    const simpsons = items.find((i) => i.title === 'The Simpsons');
    expect(simpsons).toBeDefined();
    expect(simpsons!.type).toBe('series');
    expect(simpsons!.seasonsOnDisk).toEqual([36]);
    expect(simpsons!.subTH).toBe(true);

    const severance = items.find((i) => i.title === 'Severance');
    expect(severance!.cat).toBe('Sci-Fi');
    expect(severance!.subTH).toBe(false);
  });

  it('derives categories from the folder structure (data-driven)', () => {
    const cats = new Set(walkTv(join(MEDIA, 'tv'), 0).map((i) => i.cat));
    expect(cats).toContain('Animated');
    expect(cats).toContain('Comics');
  });
});
