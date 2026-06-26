/**
 * George mobile Firebase client for Orchestra Mode.
 * Uses the same Firestore paths as the desktop coordinator.
 *
 * Integration: pass your existing Firebase Firestore instance from George's Firebase setup.
 */
import type {
  OrchestraCommand,
  OrchestraResponse,
  DesktopStatus,
  OrchestraSession,
  CommandType,
} from '../shared/types.js';
import {
  commandDocPath,
  responseDocPath,
  desktopDocPath,
  sessionDocPath,
  generateId,
  isDesktopOnline,
  OFFLINE_THRESHOLD_MS,
  FIREBASE_PATHS,
} from '../shared/firebase-paths.js';

/** Minimal Firestore interface — compatible with @react-native-firebase/firestore or firebase JS SDK */
export interface FirestoreLike {
  doc(path: string): DocRefLike;
  collection(path: string): CollectionRefLike;
}

export interface DocRefLike {
  get(): Promise<DocSnapshotLike>;
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  onSnapshot(callback: (snapshot: DocSnapshotLike) => void): () => void;
}

export interface CollectionRefLike {
  where(field: string, op: string, value: unknown): QueryLike;
}

export interface QueryLike {
  get(): Promise<QuerySnapshotLike>;
  orderBy(field: string, direction?: string): QueryLike;
  limit(n: number): QueryLike;
}

export interface DocSnapshotLike {
  exists: boolean;
  id: string;
  data(): Record<string, unknown> | undefined;
}

export interface QuerySnapshotLike {
  docs: DocSnapshotLike[];
  empty: boolean;
}

export interface OrchestraMobileConfig {
  firestore: FirestoreLike;
  userId: string;
  desktopId?: string;
}

export class OrchestraFirebaseClient {
  private firestore: FirestoreLike;
  private userId: string;
  private desktopId: string;

  constructor(config: OrchestraMobileConfig) {
    this.firestore = config.firestore;
    this.userId = config.userId;
    this.desktopId = config.desktopId ?? 'any';
  }

  async sendCommand(
    type: CommandType,
    sessionId: string,
    payload: Record<string, unknown> = {}
  ): Promise<string> {
    const commandId = generateId('cmd');
    const command: OrchestraCommand = {
      id: commandId,
      type,
      sessionId,
      userId: this.userId,
      payload: { ...payload, targetDesktopId: this.desktopId },
      createdAt: Date.now(),
      status: 'pending',
    };

    await this.firestore.doc(commandDocPath(commandId)).set(command as unknown as Record<string, unknown>);
    return commandId;
  }

  waitForResponse(commandId: string, timeoutMs = 60000): Promise<OrchestraResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('Desktop response timeout'));
      }, timeoutMs);

      const unsubscribe = this.firestore.doc(responseDocPath(commandId)).onSnapshot((snapshot) => {
        if (!snapshot.exists) return;
        const data = snapshot.data() as unknown as OrchestraResponse;
        if (data?.message) {
          clearTimeout(timer);
          unsubscribe();
          resolve(data);
        }
      });
    });
  }

  async getDesktopStatus(desktopId?: string): Promise<DesktopStatus | null> {
    const id = desktopId ?? this.desktopId;
    if (id === 'any') {
      const snapshot = await this.firestore.collection(FIREBASE_PATHS.desktopStatus).get();
      if (snapshot.empty) return null;

      let best: DesktopStatus | null = null;
      for (const doc of snapshot.docs) {
        const status = doc.data() as unknown as DesktopStatus;
        if (!best || status.lastHeartbeat > best.lastHeartbeat) {
          best = status;
        }
      }
      return best;
    }

    const snapshot = await this.firestore.doc(desktopDocPath(id)).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as unknown as DesktopStatus;
  }

  async isDesktopReady(desktopId?: string): Promise<{
    online: boolean;
    limitedMode: boolean;
    summary: string;
    status: DesktopStatus | null;
  }> {
    const status = await this.getDesktopStatus(desktopId);

    if (!status || !isDesktopOnline(status.lastHeartbeat)) {
      return {
        online: false,
        limitedMode: true,
        summary: 'Desktop is offline — limited mode only.',
        status,
      };
    }

    const available = Object.values(status.tools)
      .filter((t) => t.available)
      .map((t) => t.name);

    if (status.limitedMode) {
      return {
        online: true,
        limitedMode: true,
        summary: `Some systems offline. Available: ${available.join(', ')}.`,
        status,
      };
    }

    return {
      online: true,
      limitedMode: false,
      summary: `All systems online and ready: ${available.join(', ')}.`,
      status,
    };
  }

  async saveSession(session: OrchestraSession): Promise<void> {
    await this.firestore.doc(sessionDocPath(session.id)).set(
      session as unknown as Record<string, unknown>,
      { merge: true }
    );
  }

  async getSession(sessionId: string): Promise<OrchestraSession | null> {
    const snapshot = await this.firestore.doc(sessionDocPath(sessionId)).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as unknown as OrchestraSession;
  }

  listenForTaskUpdates(
    projectId: string,
    callback: (tasks: Record<string, unknown>[]) => void
  ): () => void {
    let lastTasks: Record<string, unknown>[] = [];

    const poll = async () => {
      const snapshot = await this.firestore
        .collection(FIREBASE_PATHS.tasks)
        .where('projectId', '==', projectId)
        .get();

      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (JSON.stringify(tasks) !== JSON.stringify(lastTasks)) {
        lastTasks = tasks;
        callback(tasks);
      }
    };

    const interval = setInterval(() => poll().catch(console.error), 5000);
    poll().catch(console.error);

    return () => clearInterval(interval);
  }
}

export { isDesktopOnline, OFFLINE_THRESHOLD_MS };
