import { COLLECTIONS, type DeckAction, type DeckMemory, type ProvenanceSource } from '@mediadeck/types';
import type { StorageProvider } from '@mediadeck/storage';

/** Load Deck's conversation memory, oldest first. */
export async function loadMemory(storage: StorageProvider): Promise<DeckMemory[]> {
  const docs = await storage.queryDocs<DeckMemory>(COLLECTIONS.deckMemory);
  return docs.sort((a, b) => a.ts - b.ts);
}

let counter = 0;
function id(ts: number): string {
  // Monotonic within a process; ts prefix keeps chronological sort stable.
  return `${ts}-${(counter++).toString(36)}`;
}

export async function appendMemory(
  storage: StorageProvider,
  entry: {
    role: DeckMemory['role'];
    text: string;
    checked?: ProvenanceSource[];
    action?: DeckAction;
    ts: number;
  },
): Promise<DeckMemory> {
  const doc: DeckMemory = {
    id: id(entry.ts),
    role: entry.role,
    text: entry.text,
    checked: entry.checked ?? [],
    action: entry.action,
    ts: entry.ts,
  };
  await storage.setDoc(COLLECTIONS.deckMemory, doc.id, doc);
  return doc;
}

/** Clear all memory (the "Deck remembers our past chats · Clear" control). */
export async function clearMemory(storage: StorageProvider): Promise<void> {
  const docs = await storage.queryDocs<DeckMemory>(COLLECTIONS.deckMemory);
  for (const d of docs) await storage.deleteDoc(COLLECTIONS.deckMemory, d.id);
}
