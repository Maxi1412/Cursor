import type { Config } from '@mediadeck/config';
import type { StorageProvider } from '@mediadeck/storage';
import type { Adapters } from './adapters/index.js';

/** Everything a route/capability/Deck needs, assembled once at boot. */
export interface AppContext {
  config: Config;
  storage: StorageProvider;
  adapters: Adapters;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}
