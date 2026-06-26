# George Orchestra Coordinator

Desktop coordinator for **George** — voice-controlled project management from your phone.

## Fastest path (Windows)

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Cursor
npm install
npm run george:setup          # integrate into Personal_caledar automatically
npm run orchestra:start       # start desktop coordinator
npm run george:full-deploy     # build APK v2.19.0 → local + K: drive
```

See **[docs/QUICKSTART.md](docs/QUICKSTART.md)** for the shortest test sequence.

## What `george:setup` does automatically

1. Copies `orchestra/` into `C:\Users\acer\Documents\Claude\Projects\Personal_caledar\orchestra\`
2. Patches George speech handler + `App.tsx` (or creates `MANUAL_HOOK.ts`)
3. Merges Firestore rules for `orchestra_*` collections
4. Verifies Firebase project ID matches `google-services.json`

## George project path

`C:\Users\acer\Documents\Claude\Projects\Personal_caledar`

Edit `george-orchestra.config.json` if your path differs.

## Google Drive deploy (K: drive)

APK auto-copied to:
`K:\Application Projects\personal calendar\Personal_Calendar_v2.19.0.apk`

Google Drive account: **maxscheurer85@gmail.com** (mapped as **K:** in This PC)

Also copies to Synology/NAS if mapped drives are detected.

## Docs

- [QUICKSTART.md](docs/QUICKSTART.md) — minimal commands + test sequence
- [GEORGE_INTEGRATION.md](docs/GEORGE_INTEGRATION.md) — architecture details
- [TESTING.md](docs/TESTING.md) — full test plan

## Environment variables

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON path |
| `ORCHESTRA_DESKTOP_ID` | Desktop ID (default: `desktop_<hostname>`) |
| `ORCHESTRA_WORKSPACE_ROOT` | New project folder root |

## Firebase collections

| Collection | Purpose |
|------------|---------|
| `orchestra_desktops` | Desktop heartbeat |
| `orchestra_commands` | Phone → desktop |
| `orchestra_responses` | Desktop → phone |
| `orchestra_projects` | Project metadata |
| `orchestra_tasks` | Delegated subtasks |
| `orchestra_sessions` | Session state |

## License

Private — for personal use with George.
