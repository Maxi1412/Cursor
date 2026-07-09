# MediaDeck

Self-hosted **media-library management & automation** with a phone-first PWA and an AI assistant
named **Deck**. It manages a TV + movie collection on a Synology NAS — tracks new episodes, flags
new releases, backfills gaps, upgrades low-quality files, finds/renames Thai subtitles, and scans
for duplicates / corruption / misorganization.

> **Management only.** MediaDeck never plays media — playback is Synology DS Video Station's job.
> Every destructive action goes to the Recycle Bin (recoverable), never a hard delete.

This repository is a **TypeScript monorepo** (pnpm + Turborepo). It is **local-first and
cloud-ready**: the whole stack boots and is testable with **zero cloud credentials** — every external
system (Sonarr, TMDB, Download Station, Anthropic, Firestore, Firebase Auth, ntfy) sits behind an
adapter with a `mock` implementation. Flip an adapter to `real` via env when you have the credential.

## Layout

| Path | What |
|---|---|
| `apps/dashboard` | PWA — Vite + React + TS, built to match `mediadeck.jsx` |
| `services/orchestrator` | Fastify API + 7 capability modules + Deck AI + external adapters |
| `services/scanner` | Scheduled worker: walk media, resolve via TMDB/Sonarr, write inventory |
| `services/deck-worker` | Placeholder for a future Deck extraction (runs in orchestrator today) |
| `tools/poller` | Claude Code job poller for the Windows desktop |
| `packages/types` | `@mediadeck/types` — zod schemas + inferred types for the data model |
| `packages/core` | `@mediadeck/core` — the two-tier gate + schedule projection + provenance |
| `packages/storage` | `@mediadeck/storage` — `StorageProvider` + SQLite + Firestore backends |
| `packages/config` | `@mediadeck/config` — env parsing + adapter mode selection |
| `deploy` | `docker-compose.yml`, `.env.example`, `setup.sh` — the Synology stack |
| `docs` | `NAS-RUNBOOK.md`, `ARCHITECTURE.md`, `DATA-MODEL.md` |

## Quick start (local, no NAS, no credentials)

```bash
pnpm install
pnpm typecheck && pnpm test     # types compile; gate/storage tests pass
pnpm dev                        # all services mocked + the PWA on http://localhost:5173
```

Everything is **off by default**. A capability acts on a category only when **both** its feature
master (Settings → Automations) **and** that category's toggle are on — the two-tier activation model.

## Deploying to the Synology NAS

The build happens here; you run one command on the NAS. See [`docs/NAS-RUNBOOK.md`](docs/NAS-RUNBOOK.md).

```bash
# on the NAS, after cloning:
cp deploy/.env.example deploy/.env   # fill in your keys (never committed)
bash deploy/setup.sh                 # pulls images, builds, brings the stack up
```

## Status

First-pass **scaffold**: real structure, UI, service skeletons, storage, Docker stack, and runbook —
runnable end-to-end with mocks. Deep per-capability logic and live-service wiring land in later
phases (search the tree for `TODO(phase-N)`). See `MEDIADECK_BUILD_SPEC.md` for the full spec.
