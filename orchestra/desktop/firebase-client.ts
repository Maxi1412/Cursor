import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  commandDocPath,
  responseDocPath,
  desktopDocPath,
  projectDocPath,
  taskDocPath,
  sessionDocPath,
  generateId,
} from '../shared/firebase-paths.js';
import type {
  OrchestraCommand,
  OrchestraResponse,
  OrchestraProject,
  OrchestraTask,
  OrchestraSession,
} from '../shared/types.js';
import type { HealthCheckResult } from './health-check.js';

let app: App | undefined;
let db: Firestore | undefined;

export function initFirebase(): Firestore {
  if (db) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }

  if (getApps().length === 0) {
    if (credentialsPath) {
      const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      app = initializeApp({ projectId });
    }
  }

  db = getFirestore();
  return db;
}

export function getDb(): Firestore {
  if (!db) return initFirebase();
  return db;
}

export async function writeDesktopHeartbeat(status: HealthCheckResult): Promise<void> {
  const firestore = getDb();
  await firestore.doc(desktopDocPath(status.desktopId)).set(
    {
      ...status,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function writeResponse(response: OrchestraResponse): Promise<void> {
  const firestore = getDb();
  await firestore.doc(responseDocPath(response.commandId)).set({
    ...response,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateCommandStatus(
  commandId: string,
  status: OrchestraCommand['status']
): Promise<void> {
  const firestore = getDb();
  await firestore.doc(commandDocPath(commandId)).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function saveProject(project: OrchestraProject): Promise<void> {
  const firestore = getDb();
  await firestore.doc(projectDocPath(project.id)).set({
    ...project,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function saveTask(task: OrchestraTask): Promise<void> {
  const firestore = getDb();
  await firestore.doc(taskDocPath(task.id)).set({
    ...task,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateSession(session: Partial<OrchestraSession> & { id: string }): Promise<void> {
  const firestore = getDb();
  await firestore.doc(sessionDocPath(session.id)).set(
    {
      ...session,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export function listenForCommands(
  desktopId: string,
  handler: (command: OrchestraCommand) => Promise<void>
): () => void {
  const firestore = getDb();
  const unsubscribe = firestore
    .collection('orchestra/commands')
    .where('status', '==', 'pending')
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const command = change.doc.data() as OrchestraCommand;
        const targetDesktop = command.payload?.targetDesktopId as string | undefined;
        if (targetDesktop && targetDesktop !== desktopId && targetDesktop !== 'any') continue;

        try {
          await handler(command);
        } catch (err) {
          console.error(`[orchestra] Command handler error:`, err);
        }
      }
    });

  return unsubscribe;
}

export function createProjectRecord(
  userId: string,
  name: string,
  description: string,
  assignedTools: OrchestraProject['assignedTools']
): OrchestraProject {
  const now = Date.now();
  return {
    id: generateId('proj'),
    name,
    description,
    status: 'planning',
    assignedTools,
    createdAt: now,
    updatedAt: now,
    userId,
  };
}

export function createTaskRecord(
  projectId: string,
  title: string,
  description: string,
  assignedTool: OrchestraTask['assignedTool']
): OrchestraTask {
  const now = Date.now();
  return {
    id: generateId('task'),
    projectId,
    title,
    description,
    assignedTool,
    status: 'pending',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
}
