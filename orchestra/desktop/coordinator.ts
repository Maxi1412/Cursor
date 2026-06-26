import os from 'node:os';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  routeRequest,
  buildDelegationPlan,
  orchestraConfig,
} from '../shared/routing.js';
import { generateId } from '../shared/firebase-paths.js';
import type {
  OrchestraCommand,
  OrchestraResponse,
  OrchestraTask,
  OrchestraPhase,
} from '../shared/types.js';
import { runHealthCheck, formatHealthSummary, type HealthCheckResult } from './health-check.js';
import { executeDelegation } from './delegates.js';
import {
  initFirebase,
  writeDesktopHeartbeat,
  writeResponse,
  updateCommandStatus,
  saveProject,
  saveTask,
  updateSession,
  createProjectRecord,
  createTaskRecord,
  listenForCommands,
} from './firebase-client.js';

const DESKTOP_ID = process.env.ORCHESTRA_DESKTOP_ID ?? `desktop_${os.hostname()}`;
const WORKSPACE_ROOT =
  process.env.ORCHESTRA_WORKSPACE_ROOT ??
  (process.platform === 'win32'
    ? 'C:\\Users\\acer\\Documents\\Claude\\Projects'
    : join(os.homedir(), 'Projects'));

export class OrchestraCoordinator {
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private unsubscribe?: () => void;
  private lastHealth?: HealthCheckResult;

  async start(): Promise<void> {
    console.log(`[orchestra] Starting coordinator (desktop: ${DESKTOP_ID})`);
    console.log(`[orchestra] Workspace root: ${WORKSPACE_ROOT}`);

    initFirebase();
    await this.sendHeartbeat();

    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat().catch(console.error),
      orchestraConfig.firebase.heartbeatIntervalMs
    );

    this.unsubscribe = listenForCommands(DESKTOP_ID, (cmd) => this.handleCommand(cmd));
    console.log('[orchestra] Listening for commands from George...');
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribe) this.unsubscribe();
    console.log('[orchestra] Coordinator stopped.');
  }

  private async sendHeartbeat(): Promise<void> {
    this.lastHealth = await runHealthCheck(DESKTOP_ID);
    await writeDesktopHeartbeat(this.lastHealth);
  }

  private async handleCommand(command: OrchestraCommand): Promise<void> {
    console.log(`[orchestra] Received command: ${command.type} (${command.id})`);
    await updateCommandStatus(command.id, 'processing');

    try {
      const response = await this.processCommand(command);
      await writeResponse(response);
      await updateCommandStatus(command.id, 'completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await writeResponse({
        commandId: command.id,
        sessionId: command.sessionId,
        message: `Error: ${message}`,
        phase: 'error',
        createdAt: Date.now(),
      });
      await updateCommandStatus(command.id, 'failed');
    }
  }

  private async processCommand(command: OrchestraCommand): Promise<OrchestraResponse> {
    const health = this.lastHealth ?? (await runHealthCheck(DESKTOP_ID));
    const base = {
      commandId: command.id,
      sessionId: command.sessionId,
      desktopStatus: health,
      createdAt: Date.now(),
    };

    switch (command.type) {
      case 'activate':
        return this.handleActivate(base, health);
      case 'health_check':
      case 'status':
        return this.handleStatus(base, health);
      case 'new_project':
        return this.handleNewProject(base, command, health);
      case 'continue_project':
        return this.handleContinueProject(base, command);
      case 'deactivate':
        return this.handleDeactivate(base, command);
      default:
        return {
          ...base,
          message: `Unknown command type: ${command.type}`,
          phase: 'error',
        };
    }
  }

  private async handleActivate(
    base: Omit<OrchestraResponse, 'message' | 'phase'>,
    health: HealthCheckResult
  ): Promise<OrchestraResponse> {
    const summary = formatHealthSummary(health);
    const phase: OrchestraPhase = health.limitedMode ? 'limited_mode' : 'awaiting_project_choice';

    let message: string;
    if (!health.tools.cursor?.available) {
      message = `${orchestraConfig.conversation.desktopOffline} ${summary}`;
    } else if (health.limitedMode) {
      message = `${orchestraConfig.conversation.partialOnline} ${summary} ${orchestraConfig.conversation.askProjectChoice}`;
    } else {
      message = `${orchestraConfig.conversation.allOnline} ${summary} ${orchestraConfig.conversation.askProjectChoice}`;
    }

    await updateSession({
      id: base.sessionId,
      userId: 'desktop',
      active: true,
      phase,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });

    return { ...base, message, phase };
  }

  private async handleStatus(
    base: Omit<OrchestraResponse, 'message' | 'phase'>,
    health: HealthCheckResult
  ): Promise<OrchestraResponse> {
    return {
      ...base,
      message: formatHealthSummary(health),
      phase: health.limitedMode ? 'limited_mode' : 'in_progress',
    };
  }

  private async handleNewProject(
    base: Omit<OrchestraResponse, 'message' | 'phase'>,
    command: OrchestraCommand,
    health: HealthCheckResult
  ): Promise<OrchestraResponse> {
    const description =
      (command.payload.description as string) ||
      (command.payload.projectDescription as string) ||
      'Unnamed project';

    const projectName =
      (command.payload.projectName as string) ||
      description.split(/[.!?]/)[0].slice(0, 80) ||
      'New Project';

    const routing = routeRequest(description);
    const plan = buildDelegationPlan(projectName, description, routing);

    const project = createProjectRecord(
      command.userId,
      projectName,
      description,
      routing.primaryTools
    );

    const projectDir = join(WORKSPACE_ROOT, projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_'));
    await mkdir(projectDir, { recursive: true });

    const tasks: OrchestraTask[] = [];
    for (const item of plan) {
      const task = createTaskRecord(project.id, item.title, item.description, item.tool);
      const result = await executeDelegation(item.tool, item.title, item.description, {
        projectId: project.id,
        projectName,
        description,
        workspaceRoot: projectDir,
      });

      task.status = result.success ? 'in_progress' : 'failed';
      task.progress = result.success ? 10 : 0;
      task.output = result.output;
      task.error = result.error;
      tasks.push(task);
      await saveTask(task);
    }

    project.status = 'active';
    await saveProject(project);

    await updateSession({
      id: command.sessionId,
      active: true,
      phase: 'delegating',
      currentProjectId: project.id,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      userId: command.userId,
    });

    const toolList = routing.primaryTools.join(', ');
    const offlineNote = health.limitedMode ? ' Running in limited mode — some tools unavailable.' : '';

    const message = [
      `Project "${projectName}" created.`,
      `Routing: ${toolList}.`,
      routing.reasoning,
      `Created ${tasks.length} tasks. Workspace: ${projectDir}.${offlineNote}`,
      "I'll report progress as tasks complete.",
    ].join(' ');

    return {
      ...base,
      message,
      phase: 'delegating',
      routing,
      projectId: project.id,
      tasks,
    };
  }

  private async handleContinueProject(
    base: Omit<OrchestraResponse, 'message' | 'phase'>,
    command: OrchestraCommand
  ): Promise<OrchestraResponse> {
    const projectId = command.payload.projectId as string | undefined;
    const projectName = command.payload.projectName as string | undefined;

    return {
      ...base,
      message: projectId || projectName
        ? `Resuming project ${projectName ?? projectId}. Cursor is opening the workspace.`
        : 'Please tell me which project to continue. You can say the project name.',
      phase: 'awaiting_project_description',
      projectId,
    };
  }

  private async handleDeactivate(
    base: Omit<OrchestraResponse, 'message' | 'phase'>,
    command: OrchestraCommand
  ): Promise<OrchestraResponse> {
    await updateSession({
      id: command.sessionId,
      active: false,
      phase: 'idle',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      userId: command.userId,
    });

    return {
      ...base,
      message: orchestraConfig.conversation.deactivated,
      phase: 'idle',
    };
  }
}

export async function startCoordinator(): Promise<OrchestraCoordinator> {
  const coordinator = new OrchestraCoordinator();
  await coordinator.start();
  return coordinator;
}
