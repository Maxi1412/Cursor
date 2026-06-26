import type { ToolId } from '../shared/types.js';

export interface DelegateContext {
  projectId: string;
  projectName: string;
  description: string;
  workspaceRoot: string;
}

export interface DelegateResult {
  tool: ToolId;
  success: boolean;
  output: string;
  error?: string;
}

export interface ToolDelegate {
  id: ToolId;
  execute(taskTitle: string, taskDescription: string, ctx: DelegateContext): Promise<DelegateResult>;
}

function logAction(tool: ToolId, action: string): string {
  return `[${tool}] ${action}`;
}

export const cursorDelegate: ToolDelegate = {
  id: 'cursor',
  async execute(title, description, ctx) {
    const output = [
      logAction('cursor', `Coordinating: ${title}`),
      `Workspace: ${ctx.workspaceRoot}`,
      `Project: ${ctx.projectName} (${ctx.projectId})`,
      `Action: ${description}`,
      'Cursor will open the project folder and assign subtasks to specialists.',
    ].join('\n');

    return { tool: 'cursor', success: true, output };
  },
};

export const claudeDelegate: ToolDelegate = {
  id: 'claude_desktop',
  async execute(title, description) {
    const output = [
      logAction('claude_desktop', `Frontend/UI task: ${title}`),
      description,
      'Delegated to Claude Desktop for UI design, components, and creative work.',
    ].join('\n');

    return { tool: 'claude_desktop', success: true, output };
  },
};

export const codexDelegate: ToolDelegate = {
  id: 'codex',
  async execute(title, description) {
    const output = [
      logAction('codex', `Backend/logic task: ${title}`),
      description,
      'Delegated to Codex/GPT for backend, Firebase, APIs, and testing.',
    ].join('\n');

    return { tool: 'codex', success: true, output };
  },
};

export const elevenlabsDelegate: ToolDelegate = {
  id: 'elevenlabs',
  async execute(title, description) {
    const output = [
      logAction('elevenlabs', `Voice task: ${title}`),
      description,
      'Delegated to ElevenLabs for TTS voice configuration.',
    ].join('\n');

    return { tool: 'elevenlabs', success: true, output };
  },
};

export const terminalDelegate: ToolDelegate = {
  id: 'terminal',
  async execute(title, description, ctx) {
    const output = [
      logAction('terminal', `Shell task: ${title}`),
      `cd "${ctx.workspaceRoot}"`,
      description,
    ].join('\n');

    return { tool: 'terminal', success: true, output };
  },
};

export const githubDelegate: ToolDelegate = {
  id: 'github',
  async execute(title, description) {
    const output = [
      logAction('github', `GitHub task: ${title}`),
      description,
      'Use gh CLI or git for repository operations.',
    ].join('\n');

    return { tool: 'github', success: true, output };
  },
};

export const firebaseDelegate: ToolDelegate = {
  id: 'firebase',
  async execute(title, description) {
    const output = [
      logAction('firebase', `Firebase task: ${title}`),
      description,
    ].join('\n');

    return { tool: 'firebase', success: true, output };
  },
};

export const chromeDelegate: ToolDelegate = {
  id: 'chrome',
  async execute(title, description) {
    const output = [
      logAction('chrome', `Research task: ${title}`),
      description,
    ].join('\n');

    return { tool: 'chrome', success: true, output };
  },
};

export const DELEGATES: Record<ToolId, ToolDelegate> = {
  cursor: cursorDelegate,
  claude_desktop: claudeDelegate,
  codex: codexDelegate,
  elevenlabs: elevenlabsDelegate,
  terminal: terminalDelegate,
  github: githubDelegate,
  firebase: firebaseDelegate,
  chrome: chromeDelegate,
};

export async function executeDelegation(
  tool: ToolId,
  title: string,
  description: string,
  ctx: DelegateContext
): Promise<DelegateResult> {
  const delegate = DELEGATES[tool];
  if (!delegate) {
    return {
      tool,
      success: false,
      output: '',
      error: `No delegate for tool: ${tool}`,
    };
  }

  try {
    return await delegate.execute(title, description, ctx);
  } catch (err) {
    return {
      tool,
      success: false,
      output: '',
      error: err instanceof Error ? err.message : 'Delegation failed',
    };
  }
}
