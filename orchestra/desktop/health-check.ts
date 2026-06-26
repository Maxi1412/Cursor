import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import type { ToolAvailability, ToolId } from '../shared/types.js';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  desktopId: string;
  hostname: string;
  online: true;
  lastHeartbeat: number;
  tools: Record<ToolId, ToolAvailability>;
  version: string;
  limitedMode: boolean;
}

interface ToolCheck {
  id: ToolId;
  name: string;
  check: () => Promise<{ available: boolean; blockReason?: string }>;
}

const IS_WIN = process.platform === 'win32';

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const check = IS_WIN ? `where ${cmd}` : `which ${cmd}`;
    await execAsync(check);
    return true;
  } catch {
    return false;
  }
}

async function checkProcessRunning(namePattern: string): Promise<boolean> {
  try {
    if (IS_WIN) {
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${namePattern}" /NH`,
        { timeout: 5000 }
      );
      return stdout.toLowerCase().includes(namePattern.toLowerCase().replace('.exe', ''));
    }
    const { stdout } = await execAsync(`pgrep -f "${namePattern}"`, { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

const TOOL_CHECKS: ToolCheck[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    check: async () => {
      const running = await checkProcessRunning(IS_WIN ? 'Cursor.exe' : 'cursor');
      return running
        ? { available: true }
        : { available: false, blockReason: 'Cursor process not detected' };
    },
  },
  {
    id: 'claude_desktop',
    name: 'Claude Desktop',
    check: async () => {
      const running = await checkProcessRunning(IS_WIN ? 'Claude.exe' : 'claude');
      return running
        ? { available: true }
        : { available: false, blockReason: 'Claude Desktop not running' };
    },
  },
  {
    id: 'codex',
    name: 'Codex / GPT',
    check: async () => {
      const hasOpenAI = !!(process.env.OPENAI_API_KEY);
      const hasCursor = await checkProcessRunning(IS_WIN ? 'Cursor.exe' : 'cursor');
      if (hasOpenAI || hasCursor) return { available: true };
      return { available: false, blockReason: 'No OpenAI key or Cursor agent available' };
    },
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    check: async () => {
      const hasKey = !!(process.env.ELEVENLABS_API_KEY);
      const appRunning = await checkProcessRunning(IS_WIN ? 'ElevenLabs.exe' : 'elevenlabs');
      if (hasKey || appRunning) return { available: true };
      return { available: false, blockReason: 'ElevenLabs API key or app not found' };
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    check: async () => ({ available: true }),
  },
  {
    id: 'github',
    name: 'GitHub',
    check: async () => {
      const hasGh = await commandExists('gh');
      const hasGit = await commandExists('git');
      if (hasGh || hasGit) return { available: true };
      return { available: false, blockReason: 'git/gh CLI not found' };
    },
  },
  {
    id: 'firebase',
    name: 'Firebase',
    check: async () => {
      const hasCli = await commandExists('firebase');
      const hasKey = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_PROJECT_ID);
      if (hasCli || hasKey) return { available: true };
      return { available: false, blockReason: 'Firebase CLI or credentials not configured' };
    },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    check: async () => {
      const running = await checkProcessRunning(IS_WIN ? 'chrome.exe' : 'chrome');
      return running
        ? { available: true }
        : { available: false, blockReason: 'Chrome not running' };
    },
  },
];

export async function runHealthCheck(desktopId: string): Promise<HealthCheckResult> {
  const now = Date.now();
  const tools = {} as Record<ToolId, ToolAvailability>;

  for (const toolCheck of TOOL_CHECKS) {
    try {
      const result = await toolCheck.check();
      tools[toolCheck.id] = {
        available: result.available,
        name: toolCheck.name,
        lastChecked: now,
        blockReason: result.blockReason,
      };
    } catch (err) {
      tools[toolCheck.id] = {
        available: false,
        name: toolCheck.name,
        lastChecked: now,
        blockReason: err instanceof Error ? err.message : 'Check failed',
      };
    }
  }

  const availableCount = Object.values(tools).filter((t) => t.available).length;
  const limitedMode = !tools.cursor?.available || availableCount < 3;

  return {
    desktopId,
    hostname: os.hostname(),
    online: true,
    lastHeartbeat: now,
    tools,
    version: '1.0.0',
    limitedMode,
  };
}

export function formatHealthSummary(status: HealthCheckResult): string {
  const available = Object.entries(status.tools)
    .filter(([, t]) => t.available)
    .map(([, t]) => t.name);

  const offline = Object.entries(status.tools)
    .filter(([, t]) => !t.available)
    .map(([, t]) => `${t.name}${t.blockReason ? ` (${t.blockReason})` : ''}`);

  if (status.limitedMode) {
    return `Limited mode. Online: ${available.join(', ') || 'none'}. Offline: ${offline.join('; ') || 'none'}.`;
  }

  return `All systems online and ready: ${available.join(', ')}.`;
}
