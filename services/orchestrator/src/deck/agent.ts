import { provenanceChips } from '@mediadeck/core';
import type { ProvenanceSource } from '@mediadeck/types';
import type { AppContext } from '../context.js';
import { runPreChecks } from './prechecks.js';
import { loadMemory, appendMemory, clearMemory } from './memory.js';
import { mockReply, type DeckReply } from './mock.js';

const SYSTEM_PROMPT = `You are Deck, the in-app assistant for MediaDeck — a self-hosted media-LIBRARY-MANAGEMENT system (it never plays media; playback is DS Video Station's job).
You manage a TV + movie collection: track new episodes, flag releases, backfill gaps, upgrade low-quality files, find/rename Thai subtitles, and scan for duplicates/corruption/misorganization.
Rules:
- Answer short and to the point (e.g. "Yes — all 6 Terminator films, up to Dark Fate."), then offer more.
- Ground every "do I have / what's missing / add" answer in the provided Download Station status, memory, and library index — never re-queue something already in flight/completed.
- Confirm before executing any action; destructive actions go to the Recycle Bin, never a hard delete.
- Never suggest or report on disabled features/categories or ignored/acknowledged items.
- Keep replies concise for text-to-speech.`;

export interface DeckChatResult {
  reply: string;
  checked: ProvenanceSource[];
  action?: DeckReply['action'];
  thinkingNote: string;
}

/**
 * Deck's chat entrypoint. Runs the mandatory pre-answer checks, loads memory, produces a
 * grounded reply (mock or real Anthropic), and persists both turns to memory (+NAS backup
 * is the Firestore/replica concern, handled by the storage backend).
 */
export async function deckChat(ctx: AppContext, message: string, now: number): Promise<DeckChatResult> {
  const pre = await runPreChecks(ctx, message);
  await appendMemory(ctx.storage, { role: 'user', text: message, ts: now });

  const deckCfg = ctx.config.adapters.deck;
  let reply: DeckReply;

  if (deckCfg.mode === 'real' && deckCfg.apiKey) {
    reply = await realReply(ctx, message, pre.context, pre.sources, deckCfg.apiKey, deckCfg.model);
  } else {
    reply = mockReply(message);
    // Fold in the pre-check provenance so mock replies still show what was consulted.
    reply.checked = provenanceChips([...reply.checked, ...pre.sources]);
  }

  await appendMemory(ctx.storage, {
    role: 'ai',
    text: reply.text,
    checked: reply.checked,
    action: reply.action,
    ts: now + 1,
  });

  return { reply: reply.text, checked: reply.checked, action: reply.action, thinkingNote: pre.thinkingNote };
}

async function realReply(
  ctx: AppContext,
  message: string,
  groundingContext: string,
  sources: ProvenanceSource[],
  apiKey: string,
  model: string,
): Promise<DeckReply> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const memory = await loadMemory(ctx.storage);

  const history = memory
    .slice(-20)
    .map((m) => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.text }));

  // TODO(phase-8): full tool-use loop — register the action set (grab, backfill, upgrade,
  // subtitle_sweep, add_release, file_op, resolve_health) as Anthropic tools, gate-guard each,
  // and execute on confirm. For now Deck answers grounded, without executing tools itself.
  const res = await client.messages.create({
    model,
    max_tokens: 400,
    system: `${SYSTEM_PROMPT}\n\nGrounding (consulted this turn):\n${groundingContext}`,
    messages: [...history, { role: 'user', content: message }],
  });

  const text = res.content
    .map((c) => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim();
  return { text: text || '(no reply)', checked: provenanceChips(sources) };
}

export { loadMemory, clearMemory };
