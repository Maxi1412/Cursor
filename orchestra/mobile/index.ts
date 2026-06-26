/**
 * George mobile Orchestra Mode — drop-in module.
 *
 * Copy the entire orchestra/ folder into your George project, then:
 *
 * 1. Install desktop coordinator deps in this Cursor repo (separate).
 * 2. Wire OrchestraMode into George's speech handler (see docs/GEORGE_INTEGRATION.md).
 */
export { OrchestraMode, detectOrchestraTrigger, extractProjectDescription } from './OrchestraMode.js';
export { ORCHESTRA_SYSTEM_PROMPT, ORCHESTRA_MEMORY_KEY, ORCHESTRA_SESSION_KEY } from './orchestra-prompts.js';
export { OrchestraFirebaseClient, isDesktopOnline } from './orchestra-firebase-client.js';
export type { OrchestraModeConfig, OrchestraHandleResult } from './OrchestraMode.js';
export type { FirestoreLike } from './orchestra-firebase-client.js';
