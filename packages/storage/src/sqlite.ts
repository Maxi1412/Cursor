import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { DocData, QueryFilter, StorageProvider, Unsubscribe } from './provider.js';

interface Row {
  data: string;
  rev: number;
}

/**
 * Local backend: one SQLite file, document-in-table (collection, id, JSON, rev).
 * WAL mode so the scanner and orchestrator can share one file. `watch()` polls a
 * per-collection revision counter — the whole current set is re-read only on change.
 */
export class SqliteStorage implements StorageProvider {
  readonly backend = 'sqlite' as const;
  private db: Database.Database;

  constructor(path: string, pollMs = 750) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        rev INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (collection, id)
      );
      CREATE TABLE IF NOT EXISTS collection_rev (
        collection TEXT PRIMARY KEY,
        rev INTEGER NOT NULL DEFAULT 0
      );
    `);
    this.pollMs = pollMs;
  }

  private pollMs: number;

  private bump(collection: string): void {
    this.db
      .prepare(
        `INSERT INTO collection_rev (collection, rev) VALUES (?, 1)
         ON CONFLICT(collection) DO UPDATE SET rev = rev + 1`,
      )
      .run(collection);
  }

  private revOf(collection: string): number {
    const row = this.db
      .prepare(`SELECT rev FROM collection_rev WHERE collection = ?`)
      .get(collection) as { rev: number } | undefined;
    return row?.rev ?? 0;
  }

  async getDoc<T extends DocData = DocData>(collection: string, id: string): Promise<T | null> {
    const row = this.db
      .prepare(`SELECT data, rev FROM documents WHERE collection = ? AND id = ?`)
      .get(collection, id) as Row | undefined;
    return row ? (JSON.parse(row.data) as T) : null;
  }

  async setDoc<T extends DocData = DocData>(collection: string, id: string, data: T): Promise<void> {
    const payload = JSON.stringify({ ...data, id });
    this.db
      .prepare(
        `INSERT INTO documents (collection, id, data, rev) VALUES (?, ?, ?, 0)
         ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, rev = documents.rev + 1`,
      )
      .run(collection, id, payload);
    this.bump(collection);
  }

  async updateDoc<T extends DocData = DocData>(
    collection: string,
    id: string,
    patch: Partial<T>,
  ): Promise<void> {
    const existing = (await this.getDoc<T>(collection, id)) ?? ({} as T);
    await this.setDoc(collection, id, { ...existing, ...patch, id } as T);
  }

  async deleteDoc(collection: string, id: string): Promise<void> {
    const info = this.db
      .prepare(`DELETE FROM documents WHERE collection = ? AND id = ?`)
      .run(collection, id);
    if (info.changes > 0) this.bump(collection);
  }

  private readAll<T extends DocData>(collection: string, filter?: QueryFilter): T[] {
    const rows = this.db
      .prepare(`SELECT data FROM documents WHERE collection = ?`)
      .all(collection) as { data: string }[];
    let docs = rows.map((r) => JSON.parse(r.data) as T);
    if (filter) {
      docs = docs.filter((d) =>
        Object.entries(filter).every(([k, v]) => (d as DocData)[k] === v),
      );
    }
    return docs;
  }

  async queryDocs<T extends DocData = DocData>(
    collection: string,
    filter?: QueryFilter,
  ): Promise<T[]> {
    return this.readAll<T>(collection, filter);
  }

  watch<T extends DocData = DocData>(
    collection: string,
    cb: (docs: T[]) => void,
    filter?: QueryFilter,
  ): Unsubscribe {
    let lastRev = -1;
    const tick = () => {
      const rev = this.revOf(collection);
      if (rev !== lastRev) {
        lastRev = rev;
        cb(this.readAll<T>(collection, filter));
      }
    };
    tick(); // fire immediately with current state
    const handle = setInterval(tick, this.pollMs);
    if (typeof handle === 'object' && 'unref' in handle) handle.unref();
    return () => clearInterval(handle);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
