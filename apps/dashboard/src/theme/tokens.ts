/**
 * Design tokens extracted from the MediaDeck prototype's CSS custom properties.
 * The canonical source of truth for palette + type is `global.css` (the prototype
 * stylesheet, verbatim); this typed mirror is for values needed in TS/inline styles.
 */

export const colors = {
  bg: '#0B0E13',
  surface: '#141922',
  surface2: '#1B2331',
  surface3: '#232D3E',
  line: '#28303F',
  text: '#EAEFF6',
  muted: '#7B879B',
  signal: '#FFB443',
  live: '#37D9C4',
  alert: '#FF5D6C',
  violet: '#8B7CF0',
  upg: '#4FA8FF',
  rel: '#EC6AC8',
} as const;

export type ColorToken = keyof typeof colors;

/** CSS-variable references, matching the class contract in global.css. */
export const cssVar = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface2)',
  surface3: 'var(--surface3)',
  line: 'var(--line)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  signal: 'var(--signal)',
  live: 'var(--live)',
  alert: 'var(--alert)',
  violet: 'var(--violet)',
  upg: 'var(--upg)',
  rel: 'var(--rel)',
} as const;

export const fonts = {
  display: "'Archivo','Inter',sans-serif",
  body: "'Inter',-apple-system,system-ui,sans-serif",
  mono: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
} as const;
