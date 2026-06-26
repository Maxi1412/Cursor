import orchestraConfig from './orchestra-config.json' with { type: 'json' };
import type { CommandType, TriggerMatch } from './types.js';

const { triggers } = orchestraConfig;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

function matchIntent(text: string, phrases: string[]): number {
  const normalized = normalize(text);
  let bestScore = 0;

  for (const phrase of phrases) {
    if (normalized === phrase) return 1;
    if (normalized.includes(phrase)) {
      bestScore = Math.max(bestScore, phrase.length / normalized.length);
    }
  }

  return bestScore;
}

const INTENT_MAP: Array<{ intent: CommandType; phrases: string[] }> = [
  { intent: 'deactivate', phrases: triggers.deactivate },
  { intent: 'activate', phrases: triggers.activate },
  { intent: 'new_project', phrases: triggers.newProject },
  { intent: 'continue_project', phrases: triggers.continueProject },
  { intent: 'status', phrases: triggers.status },
];

/**
 * Detect orchestra mode triggers in user speech/text.
 * Returns null intent when no orchestra trigger matches — George continues normally.
 */
export function detectOrchestraTrigger(text: string): TriggerMatch {
  const rawText = text.trim();
  if (!rawText) {
    return { matched: false, intent: null, confidence: 0, rawText };
  }

  let bestIntent: CommandType | null = null;
  let bestConfidence = 0;

  for (const { intent, phrases } of INTENT_MAP) {
    const score = matchIntent(rawText, phrases);
    if (score > bestConfidence) {
      bestConfidence = score;
      bestIntent = intent;
    }
  }

  const threshold = 0.35;
  if (bestConfidence >= threshold && bestIntent) {
    return { matched: true, intent: bestIntent, confidence: bestConfidence, rawText };
  }

  return { matched: false, intent: null, confidence: 0, rawText };
}

/**
 * Extract project description from phrases like:
 * "New project: English teaching app with native voices"
 */
export function extractProjectDescription(text: string): string | null {
  const patterns = [
    /new project[:\s]+(.+)/i,
    /start (?:a )?new project[:\s]+(.+)/i,
    /create project[:\s]+(.+)/i,
    /project[:\s]+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return null;
}

export function isOrchestraActivePhrase(text: string): boolean {
  const trigger = detectOrchestraTrigger(text);
  return trigger.matched && trigger.intent === 'activate';
}
