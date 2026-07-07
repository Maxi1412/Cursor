import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

describe('@mediadeck/config', () => {
  it('defaults everything to mock / sqlite with an empty env', () => {
    const c = loadConfig({});
    expect(c.storage.backend).toBe('sqlite');
    expect(c.adapters.sonarr.mode).toBe('mock');
    expect(c.adapters.deck.mode).toBe('mock');
    expect(c.adapters.deck.model).toBe('claude-sonnet-5');
    expect(c.warnings).toEqual([]);
  });

  it('downgrades real→mock and warns when credentials are missing', () => {
    const c = loadConfig({ TMDB_MODE: 'real' });
    expect(c.adapters.tmdb.mode).toBe('mock');
    expect(c.adapters.tmdb.ready).toBe(false);
    expect(c.warnings.some((w) => w.startsWith('tmdb'))).toBe(true);
  });

  it('activates a real adapter when credentials are present', () => {
    const c = loadConfig({ TMDB_MODE: 'real', TMDB_READ_TOKEN: 'tok' });
    expect(c.adapters.tmdb.mode).toBe('real');
    expect(c.adapters.tmdb.ready).toBe(true);
    expect(c.warnings).toEqual([]);
  });

  it('parses the auth allow-list', () => {
    const c = loadConfig({ AUTH_MODE: 'real', FIREBASE_AUTH_ALLOWLIST: 'a@x.com, b@y.com' });
    expect(c.adapters.auth.allowlist).toEqual(['a@x.com', 'b@y.com']);
    expect(c.adapters.auth.ready).toBe(true);
  });
});
