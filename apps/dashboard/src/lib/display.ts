import type { InventoryItem } from '@mediadeck/types';

/** Deterministic hash → hue, so a given title always renders the same gradient. */
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/**
 * The prototype gave each poster a hand-picked gradient. Since the live index has
 * none, derive a stable, on-palette gradient from the title — used as the fallback
 * placeholder behind (or instead of) a real poster, exactly like the prototype.
 */
export function posterGradient(seed: string): string {
  const h = hueFromString(seed);
  const h2 = (h + 26) % 360;
  return `linear-gradient(150deg, hsl(${h} 62% 52%), hsl(${h2} 55% 32%))`;
}

/** Up-to-3-char stacked initials, mirroring the prototype's `ini` (e.g. "THE\nSIM"). */
export function posterInitials(title: string): string[] {
  const words = title
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return ['?'];
  if (words.length === 1) {
    return [(words[0] ?? '').slice(0, 3).toUpperCase()];
  }
  return words.slice(0, 3).map((w) => (w[0] ?? '').toUpperCase());
}

export type ItemStatus = 'new' | 'miss' | 'ok';

/** Derive the status ring value the Library/Signal cards use. */
export function itemStatus(item: Pick<InventoryItem, 'missingCount'>): ItemStatus {
  if (item.missingCount > 0) return 'miss';
  return 'ok';
}

/** Short caption under a Library cell (mirrors the prototype's `md-cell-sub`). */
export function itemSubLabel(item: InventoryItem): string {
  if (item.missingCount > 0) return `${item.missingCount} GAPS`;
  if (item.type === 'movie') return (item.quality ?? 'OWNED').toUpperCase();
  return 'COMPLETE';
}

/** "Network"/context line shown above a title (prototype `md-sig-net`). */
export function itemContext(item: InventoryItem): string {
  return item.quality ? item.quality : item.cat;
}
