import { describe, it, expect } from 'vitest';
import { ALL_OFF, type FeatureState } from '@mediadeck/types';
import { isEnabled, isPending, categoryEnabled, type CatCfgMap } from './gate.js';
import { projectSchedule, scopesForCapability } from './schedule.js';

const allOn: FeatureState = {
  grab: true,
  subs: true,
  quality: true,
  releases: true,
  dup: true,
  corrupt: true,
  organize: true,
};

describe('two-tier gate', () => {
  it('everything is OFF by default (no config)', () => {
    const features: FeatureState = { ...ALL_OFF };
    const catCfg: CatCfgMap = {};
    expect(isEnabled('subs', 'tv', 'Animated', features, catCfg)).toBe(false);
    expect(isEnabled('grab', 'tv', 'Action', features, catCfg)).toBe(false);
  });

  it('requires BOTH master and category — neither alone is enough', () => {
    const catCfg: CatCfgMap = { 'tv:Animated': { subs: true } };

    // category on, master off -> not enabled, but pending
    expect(isEnabled('subs', 'tv', 'Animated', { ...ALL_OFF }, catCfg)).toBe(false);
    expect(isPending('subs', 'tv', 'Animated', { ...ALL_OFF }, catCfg)).toBe(true);

    // master on, category off -> not enabled, not pending
    expect(isEnabled('subs', 'tv', 'Comedy', allOn, {})).toBe(false);
    expect(isPending('subs', 'tv', 'Comedy', allOn, {})).toBe(false);

    // both on -> enabled
    expect(isEnabled('subs', 'tv', 'Animated', allOn, catCfg)).toBe(true);
  });

  it('honors the {mode}:All scope', () => {
    const catCfg: CatCfgMap = { 'movies:All': { quality: true } };
    expect(categoryEnabled('quality', 'movies', 'Horror Movies', catCfg)).toBe(true);
    expect(isEnabled('quality', 'movies', 'Horror Movies', allOn, catCfg)).toBe(true);
    // All scope is movies-only; TV unaffected
    expect(isEnabled('quality', 'tv', 'Sci-Fi', allOn, catCfg)).toBe(false);
  });

  it('does not leak a category toggle across modes', () => {
    const catCfg: CatCfgMap = { 'tv:Action': { grab: true } };
    expect(isEnabled('grab', 'movies', 'Action', allOn, catCfg)).toBe(false);
  });
});

describe('schedule projection', () => {
  it('lists only enabled masters, expanded into their categories', () => {
    const features: FeatureState = { ...ALL_OFF, subs: true, grab: true };
    const catCfg: CatCfgMap = {
      'tv:Animated': { subs: true, grab: true },
      'movies:All': { subs: true },
      'tv:Action': { quality: true }, // quality master off -> excluded entirely
    };
    const cards = projectSchedule(features, catCfg);
    const keys = cards.map((c) => c.capability).sort();
    expect(keys).toEqual(['grab', 'subs']);

    const subs = cards.find((c) => c.capability === 'subs')!;
    const labels = subs.scopes.map((s) => s.label).sort();
    expect(labels).toEqual(['All movies', 'Animated · TV']);
  });

  it('a running feature with no categories yields an empty scope list', () => {
    const cards = projectSchedule({ ...ALL_OFF, dup: true }, {});
    expect(cards).toHaveLength(1);
    expect(cards[0]!.scopes).toEqual([]);
  });

  it('scopesForCapability ignores other capabilities', () => {
    const catCfg: CatCfgMap = { 'tv:Action': { grab: true, subs: false } };
    expect(scopesForCapability('subs', catCfg)).toEqual([]);
    expect(scopesForCapability('grab', catCfg)).toHaveLength(1);
  });
});
