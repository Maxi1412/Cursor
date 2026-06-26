/**
 * George Orchestra Bridge — single import for George app.
 * Auto-copied into Personal_caledar/orchestra/ by integrate script.
 *
 * Does NOT modify any George core logic. George only calls:
 *   initGeorgeOrchestra(speakFn)
 *   handleOrchestraInput(text)
 *   getOrchestraPromptAddition(basePrompt)
 */
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrchestraMode } from './mobile/OrchestraMode';
import { ORCHESTRA_SYSTEM_PROMPT } from './mobile/orchestra-prompts';
import type { OrchestraHandleResult } from './mobile/OrchestraMode';

let orchestra: OrchestraMode | null = null;
let speakFn: ((text: string) => void | Promise<void>) | null = null;

/** Adapt @react-native-firebase/firestore to Orchestra FirestoreLike */
function createFirestoreAdapter() {
  const db = firestore();
  return {
    doc: (path: string) => db.doc(path),
    collection: (path: string) => db.collection(path),
  };
}

export async function initGeorgeOrchestra(
  onSpeak: (text: string) => void | Promise<void>
): Promise<OrchestraMode> {
  if (orchestra) return orchestra;

  speakFn = onSpeak;
  const user = auth().currentUser;

  orchestra = new OrchestraMode({
    firestore: createFirestoreAdapter(),
    userId: user?.uid ?? 'george_user',
    desktopId: 'any',
    onSpeak,
    storage: AsyncStorage,
  });

  await orchestra.initialize();
  return orchestra;
}

export async function handleOrchestraInput(text: string): Promise<OrchestraHandleResult> {
  if (!orchestra && speakFn) {
    await initGeorgeOrchestra(speakFn);
  }
  if (!orchestra) {
    return { handled: false };
  }
  return orchestra.handleInput(text);
}

export function getOrchestraPromptAddition(basePrompt: string): string {
  if (!orchestra?.isActive) return basePrompt;
  return `${basePrompt}\n\n${ORCHESTRA_SYSTEM_PROMPT}`;
}

export function isOrchestraActive(): boolean {
  return orchestra?.isActive ?? false;
}

export { OrchestraMode, ORCHESTRA_SYSTEM_PROMPT };
