# MediaDeck — Data Model

The source of truth is `@mediadeck/types` (zod schemas → inferred TS types). The same shapes
persist to **SQLite** (local, document-in-table) or **Firestore** (cloud) behind the identical
`StorageProvider` interface. The interface is deliberately document-oriented (no joins, no
cross-collection transactions) so both backends stay behaviorally identical.

## Collections (spec §10)

| Collection (path) | Doc id | Shape (`@mediadeck/types`) | Written by |
|---|---|---|---|
| `inventory` | media slug | `InventoryItem` | scanner (via orchestrator) |
| `features` | `state` | `FeatureState` (7 capability booleans) | orchestrator |
| `catCfg` | `{mode}:{cat}` | `CategoryConfig` (7 booleans) | orchestrator |
| `health` | finding id | `HealthFinding` (`dup`\|`corrupt`\|`organize`) | orchestrator (capabilities) |
| `acknowledged/subsIgnored` | media slug | `Acknowledgement` (`true`) | orchestrator |
| `acknowledged/organizeIgnored` | media slug | `Acknowledgement` (`true`) | orchestrator |
| `deckMemory` | ts-seq id | `DeckMemory` | orchestrator (Deck) |
| `notifications` | id | `Notification` | orchestrator |
| `jobs` | id | `Job` (Claude Code queue) | orchestrator ⇄ poller |
| `downloadStatus` | ext id | `DownloadStatus` (mirror of DS API) | orchestrator |

## Storage path mapping

Collection paths address either a top-level collection or a sub-list:

| Path | SQLite | Firestore |
|---|---|---|
| `inventory` | rows where `collection='inventory'` | `db.collection('inventory')` |
| `acknowledged/subsIgnored` | rows where `collection='acknowledged/subsIgnored'` | `db.collection('acknowledged').doc('subsIgnored').collection('items')` |

`watch()` is native `onSnapshot` on Firestore; on SQLite it polls a per-collection revision
counter and re-reads only on change.

## The two-tier keys

- `features/state` = `{ grab, subs, quality, releases, dup, corrupt, organize }`, all `false` by default.
- `catCfg/{mode}:{cat}` = the same 7 booleans for one category. `{mode}:All` is the whole section.
- **Enabled iff** `features[cap] && (catCfg["{mode}:All"][cap] || catCfg["{mode}:{cat}"][cap])`.

## Firestore notes (when `STORAGE_BACKEND=firestore`)

- Free (Spark) tier is enough for one user **if scanners cache and write once** (50k reads /
  20k writes / 20k deletes per day, 1 GiB). The scanner ingests in bulk; capabilities write once.
- The browser never holds the service account — it talks only to the orchestrator, which holds it
  (read-only secrets mount). See the runbook for the mount.
- Deck memory is stored here **and** should be backed up to the NAS (the SQLite backend already
  keeps a local copy when used; a Firestore→NAS export is a phase-10 task).

## IDs

Inventory ids are `slug(title)` (lowercase, non-alphanumerics → `-`). The scanner and the demo
seed use the **same** slug so a real scan cleanly overwrites the seed rather than duplicating it.
