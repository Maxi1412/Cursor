import { readFileSync } from 'node:fs';
import type { DocData, QueryFilter, StorageProvider, Unsubscribe } from './provider.js';

// firebase-admin is imported lazily (it's an optionalDependency) so the SQLite
// path works even where firebase-admin isn't installed. Types are loose on purpose (any).

export interface FirestoreOptions {
  projectId?: string;
  /** Path to the service-account JSON (read-only secrets mount on the NAS). */
  serviceAccountPath?: string;
}

/**
 * Cloud backend. Mirrors the SQLite semantics exactly. Collection paths:
 *   "inventory"                     -> db.collection('inventory')
 *   "acknowledged/subsIgnored"      -> db.collection('acknowledged').doc('subsIgnored').collection('items')
 *
 * NOTE: This is a wired skeleton — the shape is complete and correct against the
 * firebase-admin API, but it is not exercised in local (mock) runs. Verify against a
 * real project when Firestore credentials are added (see docs/DATA-MODEL.md).
 */
export class FirestoreStorage implements StorageProvider {
  readonly backend = 'firestore' as const;
  private db: any;

  private constructor(db: any) {
    this.db = db;
  }

  static async create(opts: FirestoreOptions): Promise<FirestoreStorage> {
    const admin = await import('firebase-admin').catch(() => {
      throw new Error(
        'STORAGE_BACKEND=firestore requires the optional dependency "firebase-admin". Install it or use sqlite.',
      );
    });
    const app = (admin as any).default ?? admin;
    if (!app.apps?.length) {
      const credential = opts.serviceAccountPath
        ? app.credential.cert(JSON.parse(readFileSync(opts.serviceAccountPath, 'utf8')))
        : app.credential.applicationDefault();
      app.initializeApp({ credential, projectId: opts.projectId });
    }
    return new FirestoreStorage(app.firestore());
  }

  private collRef(collection: string): any {
    const segs = collection.split('/').filter(Boolean);
    if (segs.length === 1) return this.db.collection(segs[0]);
    if (segs.length === 2) return this.db.collection(segs[0]).doc(segs[1]).collection('items');
    throw new Error(`Unsupported collection path: ${collection}`);
  }

  async getDoc<T extends DocData = DocData>(collection: string, id: string): Promise<T | null> {
    const snap = await this.collRef(collection).doc(id).get();
    return snap.exists ? ({ ...snap.data(), id } as T) : null;
  }

  async setDoc<T extends DocData = DocData>(collection: string, id: string, data: T): Promise<void> {
    await this.collRef(collection).doc(id).set({ ...data, id });
  }

  async updateDoc<T extends DocData = DocData>(
    collection: string,
    id: string,
    patch: Partial<T>,
  ): Promise<void> {
    await this.collRef(collection).doc(id).set({ ...patch, id }, { merge: true });
  }

  async deleteDoc(collection: string, id: string): Promise<void> {
    await this.collRef(collection).doc(id).delete();
  }

  private applyFilter(ref: any, filter?: QueryFilter): any {
    if (!filter) return ref;
    let q = ref;
    for (const [k, v] of Object.entries(filter)) q = q.where(k, '==', v);
    return q;
  }

  async queryDocs<T extends DocData = DocData>(
    collection: string,
    filter?: QueryFilter,
  ): Promise<T[]> {
    const snap = await this.applyFilter(this.collRef(collection), filter).get();
    return snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as T);
  }

  watch<T extends DocData = DocData>(
    collection: string,
    cb: (docs: T[]) => void,
    filter?: QueryFilter,
  ): Unsubscribe {
    const q = this.applyFilter(this.collRef(collection), filter);
    return q.onSnapshot((snap: any) => {
      cb(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as T));
    });
  }

  async close(): Promise<void> {
    // firebase-admin manages its own connection pool; nothing to close per-provider.
  }
}
