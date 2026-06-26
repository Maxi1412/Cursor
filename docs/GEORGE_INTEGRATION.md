# George Orchestra Mode — Integration Guide

This guide explains how to add Orchestra / Project Management mode to your George React Native app **without changing any existing features**.

## Architecture

```
Phone (George)                    Firebase                    Desktop (Cursor repo)
─────────────                    ────────                    ────────────────────
Speech → OrchestraMode  ──write──► commands/{id}  ──listen──►  Coordinator
         ↑                          responses/{id}  ◄──write──  Delegates
         └── onSpeak (TTS)           desktops/{id}   ◄──heartbeat Health check
```

## Step 1: Copy the module

Copy the entire `orchestra/` folder from this repo into your George project:

```
Personal_calendar/
  orchestra/          ← copy from this repo
    shared/
    mobile/
    desktop/          ← optional on phone; runs on desktop only
```

## Step 2: Wire into George's speech handler

Find your speech-to-text result handler (e.g. `onSpeechResult`, `handleVoiceCommand`). Add orchestra check **before** normal George processing:

```typescript
import { OrchestraMode } from './orchestra/mobile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore'; // or your Firebase setup

// Initialize once at app startup
const orchestra = new OrchestraMode({
  firestore,
  userId: currentUser.uid,
  desktopId: 'any', // or specific desktop ID
  onSpeak: (text) => georgeSpeak(text), // your existing TTS function
  storage: AsyncStorage,
});

await orchestra.initialize();

// In speech handler:
async function onTranscript(text: string) {
  const result = await orchestra.handleInput(text);
  if (result.handled) return; // orchestra took over — do NOT run normal George logic

  // Existing George logic unchanged below
  handleCalendar(text);
  handleExpenses(text);
  // ...
}
```

## Step 3: Add system prompt (only when active)

When `orchestra.isActive` is true, append the orchestra prompt to George's AI context:

```typescript
import { ORCHESTRA_SYSTEM_PROMPT } from './orchestra/mobile';

const systemPrompt = orchestra.isActive
  ? `${baseGeorgePrompt}\n\n${ORCHESTRA_SYSTEM_PROMPT}`
  : baseGeorgePrompt;
```

## Step 4: Start desktop coordinator

On your Windows desktop (where Cursor runs):

```powershell
cd C:\path\to\this\Cursor\repo
copy .env.example .env
# Edit .env with your Firebase project ID and service account path

npm install
npm run orchestra:start
```

Set `ORCHESTRA_WORKSPACE_ROOT` to your projects folder:
`C:\Users\acer\Documents\Claude\Projects`

## Step 5: Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

Use `orchestra/firestore.rules.example` as a starting point.

## Voice commands

| Say | Action |
|-----|--------|
| "Activate Project Management mode" | Start orchestra, check desktop |
| "New project: English teaching app with Spanish voices" | Create & delegate project |
| "Continue project" | Resume existing project |
| "Desktop status" | Health check |
| "Exit orchestra mode" | Return to normal George |

## Modular guarantee

- Orchestra code lives in `orchestra/` only
- No existing George files are modified by this repo
- If `orchestra.handleInput()` returns `{ handled: false }`, George behaves exactly as before
- Orchestra session state is stored separately (`george_orchestra_session` key)

## Tool routing

Routing logic is in `orchestra/shared/orchestra-config.json`. George analyzes the request text and scores tools by keyword matches. Cursor always coordinates. Edit keywords or add tools without touching George core code.
