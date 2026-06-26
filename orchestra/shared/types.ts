export type OrchestraPhase =
  | 'idle'
  | 'activating'
  | 'checking_desktop'
  | 'awaiting_project_choice'
  | 'awaiting_project_description'
  | 'analyzing'
  | 'delegating'
  | 'in_progress'
  | 'completed'
  | 'error'
  | 'limited_mode';

export type ToolId =
  | 'cursor'
  | 'claude_desktop'
  | 'codex'
  | 'elevenlabs'
  | 'terminal'
  | 'github'
  | 'firebase'
  | 'chrome';

export type CommandType =
  | 'activate'
  | 'deactivate'
  | 'health_check'
  | 'new_project'
  | 'continue_project'
  | 'status'
  | 'cancel'
  | 'task_update';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  routingKeywords?: string[];
  platforms: string[];
  priority: number;
}

export interface RoutingResult {
  primaryTools: ToolId[];
  scores: Record<string, number>;
  taskType: string;
  reasoning: string;
}

export interface DesktopStatus {
  desktopId: string;
  hostname: string;
  online: boolean;
  lastHeartbeat: number;
  tools: Record<ToolId, ToolAvailability>;
  version: string;
  limitedMode: boolean;
}

export interface ToolAvailability {
  available: boolean;
  name: string;
  lastChecked: number;
  blockReason?: string;
}

export interface OrchestraCommand {
  id: string;
  type: CommandType;
  sessionId: string;
  userId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface OrchestraResponse {
  commandId: string;
  sessionId: string;
  message: string;
  phase: OrchestraPhase;
  desktopStatus?: DesktopStatus;
  routing?: RoutingResult;
  projectId?: string;
  tasks?: OrchestraTask[];
  createdAt: number;
}

export interface OrchestraProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  assignedTools: ToolId[];
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export interface OrchestraTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTool: ToolId;
  status: TaskStatus;
  progress: number;
  output?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrchestraSession {
  id: string;
  userId: string;
  active: boolean;
  phase: OrchestraPhase;
  currentProjectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TriggerMatch {
  matched: boolean;
  intent: CommandType | null;
  confidence: number;
  rawText: string;
}
