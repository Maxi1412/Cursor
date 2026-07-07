/**
 * The storage abstraction. The whole app talks to this interface and is unaware
 * whether the backend is local SQLite or cloud Firestore.
 *
 * It is deliberately document-oriented (no joins, no cross-collection transactions)
 * so the SQLite and Firestore backends stay behaviorally identical — the portability
 * contract. Collections are addressed by a path string:
 *   - top-level:        "inventory", "health", "jobs", …
 *   - a sub-list:       "acknowledged/subsIgnored", "acknowledged/organizeIgnored"
 * In Firestore a 2-segment path maps to collection(a).doc(b).collection('items').
 */

export type DocData = Record<string, unknown>;

/** A simple equality filter: every key must match. Good enough for the data model. */
export type QueryFilter = Record<string, unknown>;

export type Unsubscribe = () => void;

export interface StorageProvider {
  /** The active backend, for logging/diagnostics. */
  readonly backend: 'sqlite' | 'firestore';

  getDoc<T extends DocData = DocData>(collection: string, id: string): Promise<T | null>;

  /** Create-or-replace the whole document. */
  setDoc<T extends DocData = DocData>(collection: string, id: string, data: T): Promise<void>;

  /** Shallow-merge a patch into an existing document (creates it if absent). */
  updateDoc<T extends DocData = DocData>(
    collection: string,
    id: string,
    patch: Partial<T>,
  ): Promise<void>;

  deleteDoc(collection: string, id: string): Promise<void>;

  /** All docs in a collection, optionally filtered by equality on top-level fields. */
  queryDocs<T extends DocData = DocData>(collection: string, filter?: QueryFilter): Promise<T[]>;

  /**
   * Observe a collection. The callback fires with the full current set on change.
   * SQLite polls (revision-based); Firestore streams via onSnapshot.
   */
  watch<T extends DocData = DocData>(
    collection: string,
    cb: (docs: T[]) => void,
    filter?: QueryFilter,
  ): Unsubscribe;

  close(): Promise<void>;
}

/** Ensure a stored document always carries its own id. */
export function withId<T extends DocData>(id: string, data: T): T & { id: string } {
  return { ...data, id };
}
