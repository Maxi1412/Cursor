# George Orchestra Coordinator

Desktop coordinator for **George** — your React Native personal assistant. This repo lets George (on your phone) conduct your full desktop setup (Cursor, Claude Desktop, Codex/GPT, ElevenLabs, terminal, GitHub, Firebase) to build apps and features via voice.

## What this repo is

- **Desktop coordinator** — runs on your Windows/Mac machine, listens for commands via Firebase
- **Shared config & routing** — tool list, trigger phrases, unbiased delegation logic
- **George mobile module** — drop-in `orchestra/mobile/` code to copy into your George app

George itself lives in your `Personal_calendar` project. This repo does **not** modify George — integration is modular.

## Quick start (desktop)

```bash
cp .env.example .env
# Edit .env: FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, ORCHESTRA_WORKSPACE_ROOT

npm install
npm run orchestra:health    # check tools without Firebase
npm run orchestra:start     # start coordinator daemon
```

Set workspace root to your projects folder, e.g.:
`C:\Users\acer\Documents\Claude\Projects`

## George integration

See [docs/GEORGE_INTEGRATION.md](docs/GEORGE_INTEGRATION.md) for wiring OrchestraMode into George's speech handler.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for step-by-step test instructions.

## Voice examples

> "Activate Project Management mode"

> "New project: English teaching app with native English and Spanish voices"

George checks desktop status, routes to Claude (UI), Codex (backend), ElevenLabs (voices), and Cursor coordinates on desktop.

## Project structure

```
orchestra/
  shared/           # Config, triggers, routing, Firebase paths, types
  desktop/          # Coordinator daemon, health checks, tool delegates
  mobile/           # Drop-in George integration (copy to George app)
docs/
  GEORGE_INTEGRATION.md
  TESTING.md
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `ORCHESTRA_DESKTOP_ID` | Desktop identifier (default: `desktop_<hostname>`) |
| `ORCHESTRA_WORKSPACE_ROOT` | Where new projects are created |
| `OPENAI_API_KEY` | Optional — Codex health check |
| `ELEVENLABS_API_KEY` | Optional — ElevenLabs health check |

## Firebase collections

| Path | Purpose |
|------|---------|
| `orchestra/desktops/{id}` | Desktop heartbeat & tool status |
| `orchestra/commands/{id}` | Commands from George (phone) |
| `orchestra/responses/{id}` | Responses to George |
| `orchestra/projects/{id}` | Project metadata |
| `orchestra/tasks/{id}` | Delegated subtasks |
| `orchestra/sessions/{id}` | Orchestra session state |

## License

Private — for personal use with George.
