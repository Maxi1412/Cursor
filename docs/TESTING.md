# George Orchestra Mode — Test Instructions

## Prerequisites

1. Firebase project with Firestore enabled
2. Service account JSON for desktop coordinator
3. George app with Firebase already configured
4. Node.js 18+ on desktop

## Test 1: Desktop health check (no Firebase)

```bash
npm install
npm run orchestra:health
```

Expected: Lists Cursor, Claude, Codex, ElevenLabs, terminal, GitHub, Firebase, Chrome with ✓/✗ based on what's running. Reports limited mode if fewer than 3 tools available.

## Test 2: Desktop coordinator + Firebase

1. Copy `.env.example` to `.env` and fill in `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS`
2. Start coordinator:

```bash
npm run orchestra:start
```

3. In Firebase Console → Firestore, verify document appears at:
   `orchestra/desktops/desktop_<hostname>`

4. Check fields: `online: true`, `lastHeartbeat` updating every ~15s, `tools` object populated

## Test 3: Trigger detection (unit-style, no app)

Create a quick test script or use Node REPL:

```bash
npx tsx -e "
import { detectOrchestraTrigger, extractProjectDescription, routeRequest } from './orchestra/shared/index.ts';

console.log(detectOrchestraTrigger('Activate Project Management mode'));
console.log(extractProjectDescription('New project: English teaching app with native Spanish voices'));
console.log(routeRequest('English teaching app with native English and Spanish voices'));
"
```

Expected:
- Trigger: `{ matched: true, intent: 'activate' }`
- Description: `English teaching app with native Spanish voices`
- Routing: includes `cursor`, `claude_desktop`, `elevenlabs` (voice keywords)

## Test 4: End-to-end command flow

With coordinator running:

1. Manually add a Firestore document at `orchestra/commands/test_cmd_1`:

```json
{
  "id": "test_cmd_1",
  "type": "activate",
  "sessionId": "test_session",
  "userId": "test_user",
  "payload": { "targetDesktopId": "any" },
  "createdAt": 1700000000000,
  "status": "pending"
}
```

2. Coordinator should process it and write response to `orchestra/responses/test_cmd_1`
3. Response should include desktop status message and phase `awaiting_project_choice`

## Test 5: New project delegation

Send command:

```json
{
  "id": "test_cmd_2",
  "type": "new_project",
  "sessionId": "test_session",
  "userId": "test_user",
  "payload": {
    "description": "English teaching app with native English and Spanish voices",
    "targetDesktopId": "any"
  },
  "createdAt": 1700000000000,
  "status": "pending"
}
```

Expected:
- Project doc in `orchestra/projects/`
- Task docs in `orchestra/tasks/` for cursor, claude_desktop, elevenlabs
- Project folder created under `ORCHESTRA_WORKSPACE_ROOT`
- Response includes routing reasoning

## Test 6: George mobile integration

After copying `orchestra/` into George:

1. Add the `OrchestraMode` wiring from `docs/GEORGE_INTEGRATION.md`
2. Start desktop coordinator
3. On phone, say: **"Activate Project Management mode"**
   - George speaks activation greeting + desktop status + project choice question
4. Say: **"New project: English teaching app with native English and Spanish voices"**
   - George speaks routing summary and delegation confirmation
5. Say: **"Exit orchestra mode"**
   - George returns to normal mode
6. Verify calendar/expenses/nutrition still work normally after exiting

## Test 7: Offline behavior

1. Stop desktop coordinator
2. On phone, activate orchestra mode
3. Expected: "Desktop is offline — limited mode only"
4. Say new project — George saves request message, does not crash

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No heartbeat in Firestore | Check `FIREBASE_PROJECT_ID` and service account path |
| Commands not processed | Ensure `status: "pending"` and coordinator is running |
| Health shows Cursor offline | Open Cursor on desktop |
| Timeout on phone | Increase `waitForResponse` timeout or check Firestore rules |
| Project folder not created | Set `ORCHESTRA_WORKSPACE_ROOT` to valid path |
