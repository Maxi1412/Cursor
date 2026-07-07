export * from './provider.js';
export { SqliteStorage } from './sqlite.js';
export { FirestoreStorage, type FirestoreOptions } from './firestore.js';
export { ACK_COLLECTIONS, seedFixtures } from './seed.js';

import type { StorageProvider } from './provider.js';
import { SqliteStorage } from './sqlite.js';
import { FirestoreStorage } from './firestore.js';

export interface CreateStorageOptions {
  backend: 'sqlite' | 'firestore';
  sqlitePath?: string;
  firebaseProjectId?: string;
  firebaseServiceAccountPath?: string;
}

/** Build the configured storage backend. Defaults to an in-memory SQLite DB. */
export async function createStorage(opts: CreateStorageOptions): Promise<StorageProvider> {
  if (opts.backend === 'firestore') {
    return FirestoreStorage.create({
      projectId: opts.firebaseProjectId,
      serviceAccountPath: opts.firebaseServiceAccountPath,
    });
  }
  return new SqliteStorage(opts.sqlitePath ?? ':memory:');
}
