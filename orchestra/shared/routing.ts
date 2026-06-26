import orchestraConfig from './orchestra-config.json' with { type: 'json' };
import type { RoutingResult, ToolDefinition, ToolId } from './types.js';

const { tools, routingRules } = orchestraConfig;

function getToolDefinitions(): ToolDefinition[] {
  return Object.values(tools) as ToolDefinition[];
}

function detectTaskType(text: string): string {
  const lower = text.toLowerCase();
  const hasApp = lower.includes('app') || lower.includes('application');
  const hasVoice = lower.includes('voice') || lower.includes('tts') || lower.includes('elevenlabs') || lower.includes('audio');
  const hasUI = lower.includes('ui') || lower.includes('frontend') || lower.includes('design') || lower.includes('teaching');
  const hasBackend = lower.includes('backend') || lower.includes('api') || lower.includes('firebase') || lower.includes('database');
  const isNew = lower.includes('new') || lower.includes('build') || lower.includes('create');

  if (hasApp && hasVoice) return 'full_stack';
  if (hasApp && (isNew || hasUI)) return 'new_app';
  if (hasApp) return 'new_app';
  if (hasVoice) return 'voice_work';
  if (hasUI) return 'ui_work';
  if (hasBackend) return 'backend_work';
  if (lower.includes('feature') || lower.includes('add')) return 'feature';
  if (hasUI && hasBackend) return 'full_stack';

  return 'feature';
}

/**
 * Unbiased tool routing: scores tools by keyword overlap.
 * Cursor is always included as coordinator.
 */
export function routeRequest(requestText: string): RoutingResult {
  const lower = requestText.toLowerCase();
  const scores: Record<string, number> = {};
  const toolDefs = getToolDefinitions();

  for (const tool of toolDefs) {
    if (tool.id === 'cursor') continue;

    let score = 0;
    for (const keyword of tool.routingKeywords ?? []) {
      if (lower.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length;
      }
    }
    if (score > 0) {
      scores[tool.id] = score;
    }
  }

  const taskType = detectTaskType(requestText);
  const defaults = (routingRules.taskTypeDefaults as Record<string, string[]>)[taskType] ?? [];

  for (const toolId of defaults) {
    scores[toolId] = (scores[toolId] ?? 0) + 0.5;
  }

  const minScore = routingRules.minScoreToAssign;
  const ranked = Object.entries(scores)
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const toolA = toolDefs.find((t) => t.id === a[0]);
      const toolB = toolDefs.find((t) => t.id === b[0]);
      return (toolB?.priority ?? 0) - (toolA?.priority ?? 0);
    });

  const primaryTools = [
    'cursor' as ToolId,
    ...ranked.map(([id]) => id as ToolId).filter((id) => id !== 'cursor'),
  ];

  const uniqueTools = [...new Set(primaryTools)];

  const topScored = ranked
    .slice(0, 3)
    .map(([id, score]) => `${id}(${score.toFixed(1)})`)
    .join(', ');

  const reasoning =
    ranked.length > 0
      ? `Task type: ${taskType}. Routed by keyword scores: ${topScored}. Cursor coordinates all work.`
      : `Task type: ${taskType}. No strong keyword matches — Cursor will coordinate with default specialists.`;

  return {
    primaryTools: uniqueTools,
    scores,
    taskType,
    reasoning,
  };
}

export function buildDelegationPlan(
  projectName: string,
  description: string,
  routing: RoutingResult
): Array<{ tool: ToolId; title: string; description: string }> {
  const tasks: Array<{ tool: ToolId; title: string; description: string }> = [];

  tasks.push({
    tool: 'cursor',
    title: `Coordinate: ${projectName}`,
    description: `Open project workspace, create folder structure, and delegate subtasks for: ${description}`,
  });

  if (routing.primaryTools.includes('claude_desktop')) {
    tasks.push({
      tool: 'claude_desktop',
      title: `UI/Frontend plan: ${projectName}`,
      description: `Design UI screens, components, and user flows for: ${description}`,
    });
  }

  if (routing.primaryTools.includes('codex')) {
    tasks.push({
      tool: 'codex',
      title: `Backend/Logic: ${projectName}`,
      description: `Implement backend, Firebase, APIs, and tests for: ${description}`,
    });
  }

  if (routing.primaryTools.includes('elevenlabs')) {
    tasks.push({
      tool: 'elevenlabs',
      title: `Voice setup: ${projectName}`,
      description: `Configure TTS voices and audio assets for: ${description}`,
    });
  }

  if (routing.primaryTools.includes('terminal')) {
    tasks.push({
      tool: 'terminal',
      title: `Environment setup: ${projectName}`,
      description: `Initialize repo, install dependencies, and run build scripts`,
    });
  }

  if (routing.primaryTools.includes('github')) {
    tasks.push({
      tool: 'github',
      title: `Repository: ${projectName}`,
      description: `Create or configure GitHub repository and initial branch structure`,
    });
  }

  return tasks;
}

export { orchestraConfig };
