/**
 * OrchestraMode — main George mobile integration module.
 *
 * Drop-in usage (does NOT modify existing George features):
 *
 * ```typescript
 * import { OrchestraMode } from './orchestra/mobile';
 *
 * const orchestra = new OrchestraMode({ firestore, userId, onSpeak });
 *
 * // In your speech-to-text handler, BEFORE normal George processing:
 * const result = await orchestra.handleInput(transcript);
 * if (result.handled) return; // orchestra took over
 *
 * // Normal George flow continues unchanged...
 * ```
 */
import { detectOrchestraTrigger, extractProjectDescription } from '../shared/triggers.js';
import { orchestraConfig } from '../shared/routing.js';
import { generateId } from '../shared/firebase-paths.js';
import type {
  OrchestraPhase,
  OrchestraSession,
  CommandType,
} from '../shared/types.js';
import { OrchestraFirebaseClient, type FirestoreLike } from './orchestra-firebase-client.js';
import { ORCHESTRA_MEMORY_KEY, ORCHESTRA_SESSION_KEY } from './orchestra-prompts.js';

export interface OrchestraModeConfig {
  firestore: FirestoreLike;
  userId: string;
  desktopId?: string;
  onSpeak: (text: string) => void | Promise<void>;
  onPhaseChange?: (phase: OrchestraPhase) => void;
  storage?: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
}

export interface OrchestraHandleResult {
  handled: boolean;
  response?: string;
  phase?: OrchestraPhase;
}

export class OrchestraMode {
  private client: OrchestraFirebaseClient;
  private onSpeak: (text: string) => void | Promise<void>;
  private onPhaseChange?: (phase: OrchestraPhase) => void;
  private storage: OrchestraModeConfig['storage'];
  private session: OrchestraSession | null = null;
  private active = false;

  constructor(config: OrchestraModeConfig) {
    this.client = new OrchestraFirebaseClient({
      firestore: config.firestore,
      userId: config.userId,
      desktopId: config.desktopId,
    });
    this.onSpeak = config.onSpeak;
    this.onPhaseChange = config.onPhaseChange;
    this.storage = config.storage;
  }

  async initialize(): Promise<void> {
    if (!this.storage) return;
    const saved = await this.storage.getItem(ORCHESTRA_SESSION_KEY);
    if (saved) {
      try {
        this.session = JSON.parse(saved);
        this.active = this.session?.active ?? false;
      } catch {
        this.session = null;
        this.active = false;
      }
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  get currentPhase(): OrchestraPhase {
    return this.session?.phase ?? 'idle';
  }

  /**
   * Main entry point. Call from George's voice/text pipeline.
   * Returns { handled: true } when orchestra mode processes the input.
   */
  async handleInput(text: string): Promise<OrchestraHandleResult> {
    const trigger = detectOrchestraTrigger(text);

    if (trigger.matched && trigger.intent) {
      return this.handleIntent(trigger.intent, text);
    }

    if (this.active && this.session) {
      return this.handleActiveConversation(text);
    }

    return { handled: false };
  }

  private async handleIntent(intent: CommandType, text: string): Promise<OrchestraHandleResult> {
    switch (intent) {
      case 'activate':
        return this.activate();
      case 'deactivate':
        return this.deactivate();
      case 'status':
        return this.checkStatus();
      case 'new_project':
        return this.startNewProject(text);
      case 'continue_project':
        return this.continueProject(text);
      default:
        return { handled: false };
    }
  }

  private async handleActiveConversation(text: string): Promise<OrchestraHandleResult> {
    const lower = text.toLowerCase();

    if (lower.includes('new project') || lower.includes('start new')) {
      return this.startNewProject(text);
    }
    if (lower.includes('existing') || lower.includes('continue')) {
      return this.continueProject(text);
    }
    if (this.session?.phase === 'awaiting_project_description') {
      return this.startNewProject(`New project: ${text}`);
    }

    const response = `I'm in orchestra mode. ${orchestraConfig.conversation.askProjectChoice}`;
    await this.speak(response);
    return { handled: true, response, phase: this.session?.phase };
  }

  async activate(): Promise<OrchestraHandleResult> {
    const sessionId = generateId('session');
    this.session = {
      id: sessionId,
      userId: '',
      active: true,
      phase: 'activating',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.active = true;
    await this.persistSession();

    await this.speak(orchestraConfig.conversation.activationGreeting);
    this.setPhase('checking_desktop');

    const readiness = await this.client.isDesktopReady();

    let statusMessage: string;
    let phase: OrchestraPhase;

    if (!readiness.online) {
      statusMessage = orchestraConfig.conversation.desktopOffline;
      phase = 'limited_mode';
    } else if (readiness.limitedMode) {
      statusMessage = `${orchestraConfig.conversation.partialOnline} ${readiness.summary}`;
      phase = 'limited_mode';
    } else {
      statusMessage = `${orchestraConfig.conversation.allOnline} ${readiness.summary}`;
      phase = 'awaiting_project_choice';
    }

    const fullMessage = `${statusMessage} ${orchestraConfig.conversation.askProjectChoice}`;
    await this.speak(fullMessage);

    try {
      const commandId = await this.client.sendCommand('activate', sessionId);
      await this.client.waitForResponse(commandId, 30000);
    } catch {
      // Desktop may be offline — local limited mode still works
    }

    this.setPhase(phase);
    return { handled: true, response: fullMessage, phase };
  }

  async deactivate(): Promise<OrchestraHandleResult> {
    if (this.session) {
      try {
        const commandId = await this.client.sendCommand('deactivate', this.session.id);
        await this.client.waitForResponse(commandId, 15000);
      } catch {
        // ignore
      }
    }

    this.active = false;
    if (this.session) {
      this.session.active = false;
      this.session.phase = 'idle';
      await this.persistSession();
    }

    const message = orchestraConfig.conversation.deactivated;
    await this.speak(message);
    return { handled: true, response: message, phase: 'idle' };
  }

  async checkStatus(): Promise<OrchestraHandleResult> {
    const readiness = await this.client.isDesktopReady();
    await this.speak(readiness.summary);
    return {
      handled: true,
      response: readiness.summary,
      phase: readiness.online ? 'in_progress' : 'limited_mode',
    };
  }

  async startNewProject(text: string): Promise<OrchestraHandleResult> {
    if (!this.active) {
      await this.activate();
    }

    const description = extractProjectDescription(text) ?? text;
    const sessionId = this.session?.id ?? generateId('session');

    this.setPhase('analyzing');
    await this.speak(`Analyzing your project: ${description}. Delegating to desktop...`);

    try {
      const commandId = await this.client.sendCommand('new_project', sessionId, {
        description,
        projectDescription: description,
        projectName: description.split(/[.!?]/)[0].slice(0, 80),
      });

      const response = await this.client.waitForResponse(commandId, 90000);
      await this.speak(response.message);
      this.setPhase(response.phase);

      if (response.projectId) {
        this.client.listenForTaskUpdates(response.projectId, (tasks) => {
          const inProgress = tasks.filter((t) => t.status === 'in_progress');
          const completed = tasks.filter((t) => t.status === 'completed');
          if (completed.length > 0) {
            const latest = completed[completed.length - 1];
            this.speak(`Task completed: ${latest.title}`).catch(console.error);
          }
        });
      }

      return { handled: true, response: response.message, phase: response.phase };
    } catch (err) {
      const message =
        err instanceof Error
          ? `Desktop is offline. I've saved your request: "${description}". It will sync when desktop comes online.`
          : 'Could not reach desktop.';
      await this.speak(message);
      return { handled: true, response: message, phase: 'limited_mode' };
    }
  }

  async continueProject(text: string): Promise<OrchestraHandleResult> {
    if (!this.active) await this.activate();

    const sessionId = this.session?.id ?? generateId('session');
    const projectName = text.replace(/continue|existing|project|resume/gi, '').trim();

    try {
      const commandId = await this.client.sendCommand('continue_project', sessionId, {
        projectName: projectName || undefined,
      });
      const response = await this.client.waitForResponse(commandId, 30000);
      await this.speak(response.message);
      return { handled: true, response: response.message, phase: response.phase };
    } catch {
      const message = 'Desktop is offline. Tell me the project name and I will queue it.';
      await this.speak(message);
      return { handled: true, response: message, phase: 'limited_mode' };
    }
  }

  private async speak(text: string): Promise<void> {
    await this.onSpeak(text);
  }

  private setPhase(phase: OrchestraPhase): void {
    if (this.session) {
      this.session.phase = phase;
      this.session.updatedAt = Date.now();
      this.persistSession().catch(console.error);
    }
    this.onPhaseChange?.(phase);
  }

  private async persistSession(): Promise<void> {
    if (!this.storage || !this.session) return;
    await this.storage.setItem(ORCHESTRA_SESSION_KEY, JSON.stringify(this.session));
    await this.storage.setItem(ORCHESTRA_MEMORY_KEY, JSON.stringify({ active: this.active, phase: this.session.phase }));
  }
}

export { detectOrchestraTrigger, extractProjectDescription } from '../shared/triggers.js';
export { ORCHESTRA_SYSTEM_PROMPT, ORCHESTRA_MEMORY_KEY } from './orchestra-prompts.js';
export { OrchestraFirebaseClient } from './orchestra-firebase-client.js';
