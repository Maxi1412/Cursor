import orchestraConfig from './orchestra-config.json' with { type: 'json' };

const { firebase } = orchestraConfig;

export const FIREBASE_PATHS = firebase.paths;

export const HEARTBEAT_INTERVAL_MS = firebase.heartbeatIntervalMs;
export const OFFLINE_THRESHOLD_MS = firebase.offlineThresholdMs;

export function desktopDocPath(desktopId: string): string {
  return `${FIREBASE_PATHS.desktopStatus}/${desktopId}`;
}

export function commandDocPath(commandId: string): string {
  return `${FIREBASE_PATHS.commands}/${commandId}`;
}

export function responseDocPath(commandId: string): string {
  return `${FIREBASE_PATHS.responses}/${commandId}`;
}

export function projectDocPath(projectId: string): string {
  return `${FIREBASE_PATHS.projects}/${projectId}`;
}

export function taskDocPath(taskId: string): string {
  return `${FIREBASE_PATHS.tasks}/${taskId}`;
}

export function sessionDocPath(sessionId: string): string {
  return `${FIREBASE_PATHS.sessions}/${sessionId}`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isDesktopOnline(lastHeartbeat: number, now = Date.now()): boolean {
  return now - lastHeartbeat < OFFLINE_THRESHOLD_MS;
}
