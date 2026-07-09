# MediaDeck — Architecture

MediaDeck is a self-hosted media-**library-management** system (it never plays media — that's
DS Video Station's job). A phone-first PWA + an AI assistant (**Deck**) sit on top of an
always-on backend running in Docker on a Synology NAS.

## The layers

```
        PHONE / DESKTOP (PWA)  ──HTTPS (Tailscale)──┐
                                                     │
  ┌───────────────────── SYNOLOGY NAS (Docker) ──────┼─────────────────────────┐
  │  dashboard (nginx) ─proxy /api→ orchestrator      │                          │
  │  orchestrator (Fastify): gate + 7 capabilities + Deck + adapters + jobs API  │
  │  scanner (cron): walk T:/M: → resolve → ingest via orchestrator              │
  │  sonarr · prowlarr · (qbittorrent) · ntfy                                    │
  │  storage: SQLite (/data/mediadeck.db)  ⇄  Firestore (optional cloud brain)   │
  └──────────────────────────────▲──────────────────────────────────────────────┘
                                  │ jobs queue (poll)
                    WINDOWS DESKTOP · Claude Code poller (messy file jobs)
```

- **Always-on backend on the NAS.** The engine and dashboard both run in Docker so the system
  works with the desktop off. The desktop is only needed for the optional Claude Code poller.

## Monorepo (TypeScript end-to-end)

One language so the **data model** and the **two-tier gate rule** are shared verbatim by the
frontend, every service, and the poller.

| Package | Role |
|---|---|
| `@mediadeck/types` | zod schemas + inferred types for all 10 collections, the feature/category model, and external DTOs |
| `@mediadeck/core` | `isEnabled()` (the gate), `projectSchedule()`, provenance helpers — pure, tested |
| `@mediadeck/config` | env parsing; picks each adapter's `mock`\|`real` mode and the `sqlite`\|`firestore` backend |
| `@mediadeck/storage` | `StorageProvider` interface + SQLite backend + Firestore backend + seed |
| `services/orchestrator` | Fastify API, adapters, capabilities, Deck, jobs — the **sole storage writer** |
| `services/scanner` | filesystem walk → metadata resolve → ingest via the orchestrator API |
| `apps/dashboard` | the PWA, built to `mediadeck.jsx` |
| `tools/poller` | Claude Code desktop job runner |

## The two-tier activation model (the spine)

Every capability has **two gates**: a **feature master** (`features/state`) and a **per-category
toggle** (`catCfg/{mode:cat}`, incl. a `{mode}:All` scope). A capability acts on a category
**iff both are on**. This AND is computed in exactly one place — `@mediadeck/core`'s
`isEnabled()` — and everything (capability runs, the Signal feed, the Schedules projection,
Deck's actions) calls it. So Settings, Library, Schedules, Signal, and behavior can never
disagree. Everything is **off by default**; a category-on/master-off state renders as *pending*.

The **Schedules** tab is a pure projection of `features × catCfg` (`projectSchedule()`).

## Local-first, cloud-ready

Every external system (Sonarr, Prowlarr, TMDB, Download Station, qBittorrent, ntfy, Anthropic,
Firestore, Firebase Auth) sits behind an **adapter** with a fully-functional `mock`. The whole
stack boots and is testable with **zero credentials**. Set an adapter's `*_MODE=real` + its
credentials to switch it live — no code change. Storage is the same story: `sqlite` locally,
`firestore` when configured, behind one `StorageProvider` interface the app is unaware of.

## Deck (the AI assistant)

Runs inside the orchestrator (an extraction point exists at `services/deck-worker` for later).
Every "do I have / what's missing / add" query runs **mandatory pre-answer checks** (Download
Station + memory + library index) so Deck never contradicts ground truth or re-queues something
already in flight. Replies are short, carry **provenance chips**, and any action is
**confirm-before-execute**, Recycle-Bin-only. `DECK_MODE=mock` gives canned replies with no key;
`real` uses the Anthropic SDK (`claude-sonnet-5`, configurable).

## Safety rules (enforced across the system)

- Management only — no playback anywhere.
- Quality / releases / library-health are **flag-only**; the user approves each.
- Destructive actions → Synology **Recycle Bin**, verify-before-delete, never a hard delete.
- Thai subs written to the same dir as the media, exact title + `.th.srt`; honest "unavailable".
- Ignore/acknowledge lists persist and are respected everywhere.

## Where the deep logic still lands (search `TODO(phase-N)`)

This is a **scaffold**. Wired but not yet deep: real subtitle fetch chain, safe-swap upgrades,
ffprobe corruption, organization/TMDB-studio checks, live Sonarr/Download Station calls, real
TMDB poster caching, Firebase Auth allow-list, and the Deck tool-use execution loop.
