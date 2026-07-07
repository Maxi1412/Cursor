import { describe, it, expect } from 'vitest';
import {
  ALL_OFF,
  CAPABILITIES,
  FeatureState,
  InventoryItem,
  scopeKey,
  parseScopeKey,
  FEATURE_META,
} from './index.js';

describe('@mediadeck/types', () => {
  it('has 7 capabilities, all off by default', () => {
    expect(CAPABILITIES).toHaveLength(7);
    expect(Object.values(ALL_OFF).every((v) => v === false)).toBe(true);
    expect(FeatureState.parse(ALL_OFF)).toEqual(ALL_OFF);
  });

  it('every capability has UI metadata', () => {
    for (const cap of CAPABILITIES) {
      expect(FEATURE_META.find((f) => f.key === cap)).toBeDefined();
    }
  });

  it('round-trips scope keys', () => {
    expect(scopeKey('tv', 'Animated')).toBe('tv:Animated');
    expect(parseScopeKey('movies:All')).toEqual({ mode: 'movies', cat: 'All' });
  });

  it('applies inventory defaults', () => {
    const item = InventoryItem.parse({
      id: 'simpsons',
      mode: 'tv',
      cat: 'Animated',
      type: 'series',
      title: 'The Simpsons',
      path: 'T:\\TV Shows\\Animated\\The Simpsons',
      lastScanned: 0,
    });
    expect(item.seasonsOnDisk).toEqual([]);
    expect(item.missingCount).toBe(0);
    expect(item.subTH).toBe(false);
  });
});
