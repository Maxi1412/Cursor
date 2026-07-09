# MediaDeck — project context for Claude Code

Read this first. Also read `MEDIADECK_BUILD_SPEC.md` (the full product spec) and
`docs/ARCHITECTURE.md` / `docs/DATA-MODEL.md` / `docs/NAS-RUNBOOK.md` before making changes.

## What this is

A self-hosted media-**library-management** PWA (never plays media) for Max's Synology NAS, with
an AI assistant, **Deck**. TypeScript monorepo (pnpm + Turborepo), **local-first and
cloud-ready**: every external system (Sonarr, Prowlarr, TMDB, Download Station, qBittorrent,
ntfy, Anthropic, Firestore, Firebase Auth) sits behind an adapter with a working `mock` — the
whole stack boots and is fully testable with zero credentials. Flip an adapter to `real` per
service via `deploy/.env` once you have that credential; missing creds safely fall back to mock.

## Current status (as of this commit)

**Built and verified** (73 tests pass; typecheck/build/lint all clean):
- `packages/types`, `packages/core` (the two-tier gate — `isEnabled()` is the single source of
  truth, everything off by default), `packages/config`, `packages/storage` (SQLite local +
  Firestore backend behind one interface).
- `services/orchestrator` — Fastify API, 6 adapters (mock + real), 7 capability modules with
  **real logic** (not stubs): recycle-bin safety module, TMDB + poster caching, Sonarr
  missing-episode/new-signal wiring, a real Thai-subtitle fallback-chain fetcher, ffprobe
  corruption checks, TMDB-studio organization checks, and real Synology/qBittorrent auth flows
  (verified against fake local servers, not yet against a live NAS).
- `services/scanner` — filesystem walk + ingest, ships a sample media tree for local dev.
- `apps/dashboard` — the PWA, built to `mediadeck.jsx`, all 5 tabs + Settings, verified
  end-to-end against a live orchestrator with headless Chromium.
- `tools/poller` — the Claude Code desktop job watcher.
- `deploy/` — Synology docker-compose stack + Dockerfiles + `setup.sh`. **Compose configs
  validate; the actual container build/deploy has never been run** (this was built in a cloud
  sandbox with no Docker daemon and no route to the NAS).

**Not done yet** — search the tree for `TODO(phase-N)`:
- The actual on-NAS deployment (nothing has been deployed anywhere — this is the next job).
- Firebase Auth allow-list enforcement, Tailscale/reverse-proxy remote access.
- Deck's tool-execution loop (real mode currently answers grounded but doesn't execute actions).
- OpenSubtitles download-step completion (search works, the file-download exchange doesn't yet).
- TV-show poster caching (movies are wired; TV intentionally skipped this pass).

## Non-negotiables (from the spec — do not relax these)

- **Management only** — no playback UI/logic anywhere.
- **Two-tier activation**: a capability runs on a category only when its feature master AND that
  category's toggle are both on. The only place that computes this is
  `packages/core/src/gate.ts::isEnabled()` — never re-implement the AND elsewhere.
- **Never hard-delete.** Every destructive action goes through
  `services/orchestrator/src/safety/recycle.ts` (Recycle Bin, verify-before-swap). Quality
  upgrades, releases, and health findings are flag-only — the user approves each.
- **Orchestrator is the sole storage writer.** The scanner and poller talk to it over HTTP, never
  to storage directly.

## Credential handling — read this before touching secrets

- `deploy/.env` is git-ignored. **Never commit it, never paste its contents into a chat, never
  put a real secret in `deploy/.env.example`** (which must stay a template with empty values).
- If you're running locally with disk access to a credentials file, read it directly from disk to
  populate `deploy/.env` — don't relay secret values through conversation unless there's no other
  way, and never echo them back in full.
- A prior session had a `MASTER_CREDENTIALS.md` file uploaded into a **cloud** chat, which
  violates that file's own "LOCAL ONLY" handling rule. If you're picking this up: confirm the
  NAS admin password and the classic GitHub PAT (it has `delete_repo` + `admin:enterprise`
  scope — much broader than this project needs) have been rotated before going further, or flag
  it to Max if unsure whether that already happened.

## Dev commands

```bash
pnpm install
pnpm typecheck && pnpm test && pnpm build   # must all stay green
pnpm dev                                     # everything mocked, PWA on :5173, API on :4000
```

## Deploying to the Synology NAS

Follow `docs/NAS-RUNBOOK.md` step by step. Short version: `cp deploy/.env.example deploy/.env`,
fill in what you have, `bash deploy/setup.sh`. It boots in mock mode even with an empty `.env`,
then you flip adapters to `real` one at a time as credentials land.
