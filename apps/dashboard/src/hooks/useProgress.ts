import { useEffect, useRef, useState } from 'react';

/**
 * Client-side progress animation (grab / upgrade / add), matching the prototype:
 * calling `start(id)` ticks that id's progress from 0 → 100 over ~1.5s. Purely
 * cosmetic — the real queueing happens server-side; this animates the button.
 */
export function useProgress(stepMs = 270) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const active = Object.keys(progress).filter((id) => (progress[id] ?? 0) < 100);
    if (!active.length) return;
    timer.current = setTimeout(() => {
      setProgress((prev) => {
        const next = { ...prev };
        for (const id of active) {
          next[id] = Math.min(100, (next[id] ?? 0) + (12 + Math.random() * 22));
        }
        return next;
      });
    }, stepMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [progress, stepMs]);

  const start = (id: string) => {
    setProgress((p) => (p[id] !== undefined ? p : { ...p, [id]: 0 }));
  };

  return { progress, start };
}
