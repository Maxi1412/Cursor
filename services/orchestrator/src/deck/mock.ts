import type { DeckAction, ProvenanceSource } from '@mediadeck/types';

export interface DeckReply {
  text: string;
  checked: ProvenanceSource[];
  action?: DeckAction;
}

/**
 * Canned, grounded replies mirroring the prototype's Deck. Used when DECK_MODE=mock so
 * the chat + voice UI work with no Anthropic key. Answers are short and to the point,
 * respect the confirm-before-execute action pattern, and carry provenance chips.
 */
export function mockReply(message: string): DeckReply {
  const q = message.toLowerCase();

  if (q.includes('action') && (q.includes('miss') || q.includes('old')))
    return {
      checked: ['Memory', 'Download Station'],
      text: "Checked our history and Download Station: you queued Die Hard 1–3 two days ago — 2 finished, 1 still downloading. Old-school picks you're still missing: Commando, Predator, Cobra. Add those 3?",
      action: {
        label: 'Add the 3',
        done: 'Added Commando, Predator, Cobra → Download Station → Action. Skipped the Die Hards already in your queue.',
        tool: 'add_release',
      },
    };
  if (q.includes('move') || q.includes('copy'))
    return {
      checked: ['Files'],
      text: "Sure — I'll move The Boys from Downloads into T:\\TV Shows\\Comics. Confirm?",
      action: { label: 'Move it', done: 'Moved. Video Station will re-index it shortly.', tool: 'file_op' },
    };
  if (q.includes('terminator'))
    return { checked: ['Library index'], text: 'Yes — all 6 Terminator films, up to Dark Fate (2160p). Want the list?' };
  if (q.includes('recommend') || q.includes('suggest'))
    return {
      checked: ['Memory', 'Download Station'],
      text: 'The Old Guard 2 just hit digital — action, 2160p, matches what you watch. Add it?',
      action: { label: 'Add it', done: "On it — The Old Guard 2 queued → Action. I'll place Thai subs when it lands.", tool: 'add_release' },
    };
  if (q.includes('missing') || q.includes('gap'))
    return {
      checked: ['Library index'],
      text: 'The Boys is missing 3 episodes: S03E03, S04E04, S04E07. Backfill them?',
      action: { label: 'Backfill', done: "Queued all 3 → Download Station. I'll swap them in as they finish.", tool: 'backfill' },
    };
  if (q.includes('subtitle') || q.includes('thai') || q.includes('sub'))
    return {
      checked: ['Library index'],
      text: '88 titles are missing Thai subs. Run a sweep and rename to .th.srt?',
      action: { label: 'Run sweep', done: "Sweep started across 88 titles. I'll notify you as subs land.", tool: 'subtitle_sweep' },
    };
  if (q.includes('duplicate') || q.includes('dupe'))
    return {
      checked: ['Library index'],
      text: 'Found duplicates. Biggest: The Dark Knight has both a 1080p and a 2160p copy. Remove the lower ones?',
      action: { label: 'Remove lower copies', done: 'Removed lower-quality duplicates → Recycle Bin. Kept the best of each.', tool: 'resolve_health' },
    };
  if (q.includes('release') || q.includes('disc') || q.includes('new') || q.includes('latest'))
    return {
      checked: ['Download Station'],
      text: '3 films just hit disc: Bad Boys: Ride or Die, Furiosa, Inside Out 2 — all 2160p. Add any?',
    };

  return {
    checked: [],
    text: "I can check that against your library, flag what's missing, or add something to Download Station. Try a title, or 'recommend an action movie.'",
  };
}
