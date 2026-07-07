import { COLLECTIONS, type DownloadStatus, type InventoryItem, type ProvenanceSource } from '@mediadeck/types';
import type { AppContext } from '../context.js';

export interface PreCheckResult {
  /** Provenance sources actually consulted (drives the chips on a grounded reply). */
  sources: ProvenanceSource[];
  /** A compact grounding context injected into Deck's prompt. */
  context: string;
  /** Progress notes shown while Deck "thinks" ("Checking Download Station & memory…"). */
  thinkingNote: string;
}

/**
 * Mandatory pre-answer checks for "do I have / what's missing / add" queries (spec §6):
 * query the live Download Station status + destination, memory, and the library index so
 * Deck never re-queues something already in flight/completed/errored and never contradicts
 * ground truth.
 */
export async function runPreChecks(ctx: AppContext, message: string): Promise<PreCheckResult> {
  const q = message.toLowerCase();
  const sources: ProvenanceSource[] = [];
  const parts: string[] = [];

  const wantsLibrary = /(have|missing|gap|own|list|subtitle|thai|dupe|duplicate|corrupt|organi)/.test(q);
  const wantsDownloads = /(add|download|grab|queue|new|release|recommend|disc|latest)/.test(q);

  // Memory is always consulted (Deck loads past chats as context).
  sources.push('Memory');

  if (wantsDownloads) {
    const tasks = await ctx.storage.queryDocs<DownloadStatus>(COLLECTIONS.downloadStatus);
    sources.push('Download Station');
    const inFlight = tasks
      .map((t) => `${t.title} [${t.state}${t.dest ? ` → ${t.dest}` : ''}]`)
      .join('; ');
    parts.push(`Download Station queue: ${inFlight || 'empty'}.`);
  }

  if (wantsLibrary || !wantsDownloads) {
    const inv = await ctx.storage.queryDocs<InventoryItem>(COLLECTIONS.inventory);
    sources.push('Library index');
    const missing = inv.filter((i) => i.missingCount > 0).length;
    const noSubs = inv.filter((i) => !i.subTH).length;
    parts.push(
      `Library index: ${inv.length} titles; ${missing} with missing episodes; ${noSubs} without Thai subs.`,
    );
  }

  const thinkingNote = wantsDownloads
    ? 'Checking Download Station & memory…'
    : wantsLibrary
      ? 'Scanning library…'
      : 'Thinking…';

  return { sources, context: parts.join('\n'), thinkingNote };
}
