import type { InventoryItem } from '@mediadeck/types';

/**
 * Push the scanned index to the orchestrator, which is the SOLE storage writer. The
 * scanner never touches the DB/Firestore directly — this keeps one write authority and
 * clean Firestore rules.
 */
export async function ingest(orchestratorUrl: string, items: InventoryItem[]): Promise<number> {
  const res = await fetch(`${orchestratorUrl}/api/inventory/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`ingest failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { written: number };
  return body.written;
}
