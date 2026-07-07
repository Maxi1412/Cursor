# MediaDeck — Build Specification & Handover

**For:** Claude Code (desktop) — build this project.
**Owner:** Max — Synology NAS at static IP `192.168.0.100`, DSM 7.2.
**Front-end reference:** `mediadeck.jsx` (interactive React prototype — the visual + interaction source of truth. Build the real UI to match its screens, flows, and design system).

---

## 0. What this is

MediaDeck is a **self-hosted media-library management and automation system** with a phone-first web UI (delivered as a **PWA**) and an AI assistant named **Deck**. It manages Max's TV and movie collection: tracks new episodes, flags new releases, backfills missing episodes, upgrades low-quality files, finds/renames Thai subtitles, and scans for duplicates/corruption/misorganization.

**Hard scope boundary — management only.** MediaDeck **never plays media**. Playback is handled by **Synology DS Video Station**. Do not build a player, streaming, or "watch" affordance anywhere. MediaDeck's only jobs: show what's owned, flag what's missing/wrong, and add/fix things (via the download client and file operations).

**Two libraries, mapped drives:**
- **TV Shows** — 12 TB, mapped `T:\` on the Windows desktop.
- **Movies** — 4 TB, mapped `M:\` on the Windows desktop.
- Plus the Synology **Download Station** completed-downloads folder.

---

## 1. Architecture

```
                          ┌──────────────────────────────────────┐
                          │        PHONE / DESKTOP (PWA)          │
                          │  MediaDeck UI  +  ntfy app (push)     │
                          └───────▲───────────────▲──────────────┘
                                  │ push          │ HTTPS (Tailscale / reverse proxy)
        ┌─────────────────────────┼───────────────┼──────────────────────────────┐
        │  SYNOLOGY NAS (192.168.0.100, DSM 7.2, Container Manager / Docker)      │
        │   ┌────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌─────────┐  │
        │   │  ntfy  │◄─│  Sonarr  │  │ Dashboard │◄►│ Orchestrator│ │ Prowlarr│  │
        │   │        │  │ +Prowlarr│  │ (web app) │  │  + Deck API │ │(indexers)│ │
        │   └────────┘  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  └─────────┘  │
        │                    │ TVDB         │ TMDB          │ Firestore (cloud)   │
        │                    ▼              ▼               ▼  + NAS backup       │
        │            Download Station   posters/meta   state / memory            │
        │   VOLUMES (native): /data/media/tv (T:) /data/media/movies (M:) /downloads│
        └────────────────────────────────▲──────────────────────────────────────┘
                                          │ mapped drives / SSH (desktop ON)
                          ┌───────────────┴──────────────┐
                          │  WINDOWS DESKTOP · Claude Code│
                          │  messy file sorting, torrent  │
                          │  adds  (T:\ TV  M:\ Movies)    │
                          └──────────────────────────────┘
```

**Backend = Docker on the NAS.** Always-on; survives the desktop being off. This is non-negotiable — the engine and the dashboard server both run in Docker on the Synology.

**Firebase Firestore = the brain.** Stores inventory index, feature/category toggle state, Deck's conversation memory, ignore/acknowledged lists, notification log, and the Claude Code job queue. Deck memory is **backed up to the NAS** as well. Firestore Spark (free) tier is sufficient for one user if scanners cache and write once (50k reads / 20k writes / 20k deletes per day, 1 GiB).

**Engines:**
- **Sonarr** — TV episode tracking, monitoring, missing-episode detection/backfill, anime mode (absolute numbering). Uses **TheTVDB** for TV metadata (its native source — TMDB cannot replace TVDB inside Sonarr).
- **TMDB** — posters/artwork/metadata and movie identification (Max has a key). Use the v4 Read Access Token as `Authorization: Bearer`.
- **Prowlarr** — indexer management feeding Sonarr.
- **Download client** — see §7.

**AI, two roles:**
- **Deck** (the in-app assistant) — runs on the NAS backend via an **Anthropic API key**; has read access to the inventory index and the same action set as the UI.
- **Claude Code** (desktop, Max's subscription) — the "messy judgment" layer for ambiguous file sorting and torrent-adding, invoked via a **Firestore job queue + desktop poller** (runs only when the desktop is on; that's why the always-on layer is the NAS).

**Push** — **ntfy** (self-hosted, free, Sonarr has native ntfy support; the phone ntfy app subscribes to a topic).

**Remote access** — **Tailscale (default/recommended)**: private mesh VPN, nothing exposed publicly. Alternatives: Cloudflare Tunnel + Access, or Synology reverse proxy + DDNS + Let's Encrypt.

**Auth** — **Firebase Authentication, Google provider**, with an allow-list so only Max's account(s) get in. *(Deferred out of the prototype for testing; REQUIRED in the build — see §9.)*

**Delivery** — **PWA** (add-to-home-screen; manifest + service worker). **No APK.** If an installable app is ever wanted, use a **TWA via Bubblewrap** (Chrome-backed) — **never a raw WebView**, which breaks Google sign-in and Web Speech (voice).

---

## 2. API keys / accounts required

| Key / account | Purpose | Status |
|---|---|---|
| **TMDB** (v4 Read Access Token) | Posters, artwork, movie/TV metadata | Max has it |
| **TheTVDB** | Sonarr's TV episode/air-date source | Free / built into Sonarr (Skyhook) |
| **Anthropic API key** | Deck (in-app AI) on the NAS backend | Max is a subscriber; get a key |
| **Claude Code** subscription | Desktop messy-file/torrent jobs | Active |
| **Firebase service account** (JSON) | Firestore + Auth | Free tier |
| **Subtitle sources** (2–3, e.g. OpenSubtitles) | Thai subtitle fetch | Sign up; some need a key |
| **Indexers** (via Prowlarr) | Sonarr release search | Mix of public/account |
| **ntfy** | Push notifications | Free, no key |
| **Tailscale** | Remote access | Free tier |

Store the Firebase service-account JSON in a read-only secrets mount; **never** ship it to the browser or a repo.

---

## 3. Front-end reference — screens & interactions

Build to match `mediadeck.jsx`. Phone-first (max content width ~428px), also renders in a device frame on wider screens. Delivered as a PWA.

### Design system (broadcast-ops console)
- **Concept:** a broadcast control booth. Signature element is the **tally light** — the amber pulse a studio camera shows when it's "live." Here a show "goes live" when a new episode has aired and is ready to grab.
- **Palette (dark booth):** bg `#0B0E13`, surfaces `#141922`/`#1B2331`/`#232D3E`, text `#EAEFF6`, muted `#7B879B`.
- **Concern colors (each capability has its own):**
  - Signal amber `#FFB443` — new episode / aired signal
  - Rose `#EC6AC8` — new release (DVD/digital)
  - Alert red `#FF5D6C` — missing episodes / corrupt files
  - Blue `#4FA8FF` — quality upgrades
  - Violet `#8B7CF0` — Thai subtitles
  - Teal/live `#37D9C4` — healthy / monitored / success
  - Muted — duplicate / organization
- **Type:** Archivo (display/titles), Inter (UI), JetBrains Mono (data/counts/paths).
- Minimal, no over-formatting; status expressed through color + small mono readouts.
- Posters in the prototype are gradient placeholders → **replace with real TMDB posters, cached locally** for fast load and to avoid API hammering. Same art in Signal thumbnails, Library grid, and detail sheet.

### Top status strip (global)
Brand ("MEDIADECK"), NAS-online dot, **active path chip** (`Desktop · direct` when the desktop is on, else `NAS · fallback`), last-scan time; right side: **general settings gear** + notification bell. The gear is the single settings entry point.

### Bottom nav — 5 tabs
`Signal` · `Library` · **`Deck`** (center, raised accent orb) · `Schedules` · `Activity`.

### Tab: Signal (the "what needs me" feed)
Top-down:
1. **Collection** — Movies / TV count cards (tap → per-category breakdown with bars & counts). Total titles up top.
2. **Thai subtitle coverage** strip (e.g. 88% · N missing) — tap to jump to Library.
3. **New signals** — aired episodes ready to grab (tally light glowing). Grab / Auto button → progress → "Sent". *Always shown (aired episodes are facts, not gated).*
4. **New releases** — films now on disc/digital. **Gated** (see §5). `+ Add` → progress → "Added to library".
5. **Needs attention** — missing-episode rows (backfill) + Thai-subs-missing rows (violet). Subs-missing rows respect the **ignore** list.
6. **Quality upgrades** — below-1080p flags. **Gated.** `Update` → progress → "Swapped · old → Recycle Bin".
7. **Library health** — duplicate / broken-file / misfiled rows. **Gated.** Actions per kind (Remove dupe / Re-download / Move / Ignore).

Tapping most Signal items opens the **detail sheet**.

### Tab: Library
- **TV / Movies** segmented toggle (top-right of title). Subtitle shows counts + drive (`437 shows · T:\ 12TB` / `847 movies · M:\ 4TB`).
- **Search** + **category chips** (data-driven from real folders; see taxonomies §4). A dashed **`+ Add`** chip → add-category sheet.
- **Category control panel** (under the chips) — per-category feature toggles for the current scope (or "All" scope). Content-feature toggles here (grab/subs/quality/releases). Shares state with Settings.
- **Grid** — poster cells with a status ring (teal complete / amber new / red missing) and a red **TH** badge when Thai subs are missing. Tap → detail sheet.
- **Add-category sheet** — name it + shows the NAS folder it allocates (`T:\TV Shows\{name}` or `M:\Movies\{name}`) → "Save & scan folder". In production this is a real NAS folder picker that creates a Sonarr root folder / library path and triggers a scan.

### Detail sheet (bottom sheet)
- **X close** (top-right) + drag grip + tap-scrim to close.
- Poster, title, tags (network, category, status).
- **Auto-grab new episodes** toggle (TV).
- **Thai subtitles row:** status (`Matched · {title}.th.srt` / `Not found`). If missing → **Find Thai subtitles** (violet) + **Ignore** (red). Searching → spinner → `Downloaded · {title}.th.srt`. If ignored → "Ignored — won't be flagged again" + **Undo**.
- **Season chips** + **episode grid** (owned teal / missing dashed-red / new amber / not-aired muted) + legend.
- **Backfill missing (N)** for shows with gaps → "Queued to Download Station".
- Movies: **Watch for 4K upgrade** toggle + the same Thai subtitles row.

### Tab: Schedules (live projection — read-only mirror of state)
- Lists only **enabled features** (masters that are on). Each card:
  - Feature name + cadence + **master toggle** (turns the whole feature off).
  - **Expands into per-category sub-rows** — one line per active category (e.g. "Drama · Movies", "Action · TV"), each with **its own small toggle**. Toggling a sub-row off = the exact same as switching that category's feature off in Settings (writes `catCfg` directly). If no categories chosen: "No categories yet — pick some in Settings."
- Empty state if nothing enabled: "Nothing running yet. Turn features on in Settings."

### Tab: Deck (AI assistant) — see §6.

### Tab: Activity
Chronological log of system actions, typed with icons/colors: grab, new-episode, scan, missing, claude (file sort), subtitle, upgrade, new-release.

### General Settings (gear, top-right) — the single control surface
- **Automations** (top): the **feature masters** (§5) — Auto-grab episodes, Thai subtitles, Quality upgrades, New releases, Duplicate scan, Corruption scan, Organization scan. Each a master on/off. *(Only capabilities that also exist per-category live here — no one-off jobs.)*
- **TV Shows** + **Movies** groups: each category is an expandable card exposing that category's feature toggles. TV categories include auto-grab; movies exclude it. A category feature switched on while its master is off shows an amber **"Turn on {feature} in the main settings to start"** note (pending).
- **System**: connection status chips (NAS, Sonarr, Download Station, TMDB, Claude API, ntfy), storage, subtitle language (Thai).
- Auth / sign-out lives here in production.

---

## 4. Category taxonomies (data-driven in production)

Chips are hardcoded in the prototype; in the build, **derive categories from the actual folder structure** on `T:\` and `M:\`, so adding a folder adds a category with no code change.

- **Movies:** Action, Anime, Drama, Comedy, DC Movies, Fantasy Movies, Marvel Movies, Sci-fi Movies, Horror Movies, Thriller Movies.
- **TV Shows:** Action, Animated, Comics (live-action based on comics), DC, Marvel, Sci-Fi, Fantasy. *(No Horror/Thriller TV.)*
- Users can **add a category** (name + point at a folder → scan/index → appears as a collection), mirroring DS Video Station library setup.

---

## 5. The activation model (two-tier) — CRITICAL

Every capability has **two gates**:

1. **Feature master** (`features[key]`, set in Settings → Automations) — the capability is turned on globally.
2. **Per-category toggle** (`catCfg["{mode}:{cat}"][key]`, set in Settings category subsections or the Library control panel) — which categories it runs on. A special **`{mode}:All`** scope means the whole TV or Movie section.

**A capability acts on a category only when BOTH are on.** Signal renders the intersection; Deck respects it. If a category toggle is on but the master is off → **pending** (amber note; nothing runs until the master is switched on, which then "starts the scan"). Everything starts **off** by default.

**Feature set (`FEATURES`)** — key → capability:
- `grab` — Auto-grab new episodes (TV only)
- `subs` — Thai subtitles
- `quality` — Quality upgrades (below-1080p flags + 4K upgrades)
- `releases` — New releases (movies on disc/digital; "new seasons" for TV)
- `dup` — Duplicate scan
- `corrupt` — Corruption scan
- `organize` — Organization scan

**Schedules tab = live projection** of `features × catCfg`. Sub-row toggles write straight to `catCfg`, so Library, Settings, Schedules, Signal, and Deck always agree (single source of truth).

---

## 6. Deck — the AI assistant (behaviors)

Deck is the master control: it can do anything the UI's toggles/actions can, by voice or text.

- **Runs on the NAS** via the Anthropic API key; has read access to the live inventory index and the full action set.
- **Persistent memory:** conversation log stored in **Firestore (+ NAS backup)**, keyed to the account, loaded as context before answering. A "Deck remembers our past chats" line + **Clear** control. *(Prototype persists via the artifact storage API; production = Firestore.)*
- **Pre-answer checks (mandatory for "do I have / what's missing / add" queries):** query the **Download Station API** for live status (downloading / completed / failed) **and destination folder**, plus **memory** and the **library index** — so it never re-queues something already in flight, completed, or errored-and-removed. Show what it's doing while thinking ("Checking Download Station & memory…", "Reading folders…", "Scanning library…").
- **Provenance:** each grounded reply shows chips for what it consulted — `Memory`, `Download Station`, `Library index`, `Files`.
- **Actions (confirm-before-execute), same as the UI:** grab episodes, backfill gaps, quality upgrade + safe-swap, subtitle sweep, add a release, and **file operations** (move/copy/rename across `T:\`, `M:\`, Downloads — same capability as Claude Code). Inline action buttons in chat execute and report back.
- **Answers are short and to the point** ("Yes — all 6 Terminator films, up to Dark Fate." then offer more).
- **Voice:** speech-to-text input (mic) and text-to-speech output (speaker on each reply) via the Web Speech API in the PWA. Keep replies concise for TTS.
- **Proactive recommendations** that match the user's **enabled** categories; on "yes", add the release/URL to Download Station in the **correct directory**.
- **Respects state:** never suggests or reports on disabled features/categories or **ignored/acknowledged** items.

---

## 7. Download client (§ decision)

- Max's current grabber is **Synology Download Station**, and the UI/Deck must read its API for **status + destination folder**. Keep Download Station as the default.
- **Caveat (document + implement fallback):** on DSM 7.2, Sonarr's Download Station client can hit a Synology-side "no default destination" quirk. Workaround: log into DSM once as the exact user Sonarr connects as, set that user's Download Station default location, and give Sonarr the **shared-folder-relative** directory (no leading `/`). If it still fails, **fall back to qBittorrent** in Docker (Sonarr's reliable, community-standard client) with category `tv-sonarr`. Present this as a fallback, not a forced switch.
- Sonarr → download client → completed files land in `/data/downloads` → Sonarr imports/renames into the library. Use the TRaSH single-`/data`-volume layout so hardlinks/atomic moves work.

---

## 8. Feature behaviors (backend contracts)

**Thai subtitles (`subs`)**
- For each title, check for a Thai subtitle track/file. If missing, pull from the configured **2–3 sources in a fallback chain**.
- Download to the **same directory as the media file**, renamed to the **exact title with a language-tagged `.th.srt`** so DS Video Station reads it as Thai.
- Log titles with **no Thai subs available** honestly ("unavailable") rather than silently failing.
- **Ignore list** (`subsIgnored`, persisted): ignored titles are never re-searched, never re-flagged, and stay off Signal until undone.

**Auto-grab episodes (`grab`)** — Sonarr per-series/per-category monitoring; newly aired → Signal; auto vs. manual grab per toggle.

**Missing episodes** — Sonarr Wanted/Missing is the detector; backfill on user approval (surfaced in Needs attention / detail sheet).

**Quality upgrades (`quality`)**
- **Flag only** anything below 1080p (and offer 4K upgrades). **Never auto-download** — user approves each.
- **Safe swap:** verify the new file is present and complete in the correct directory **before** touching the old one; move the old file to the **Synology Recycle Bin** (recoverable), never a hard delete. If verification fails, keep both and log — never create a gap.

**New releases (`releases`)**
- Watch theatrical→physical/digital windows (TMDB/Sonarr). **Only flag genuine Blu-ray/WEB releases** — never early cam/telesync rips. User approves the add; then it downloads to the correct category folder.

**Duplicate scan (`dup`)** — detect the same title across folders/qualities; keep the best, recycle the rest (recoverable). Per-category gated.

**Corruption scan (`corrupt`)** — best-effort detection of missing/zero audio, broken/truncated, or unplayable files (ffprobe + stream checks). **Flag only.** Be honest in the spec/UI that "no sound / won't play" detection catches most but not all cases.

**Organization scan (`organize`)** — compare a title's TMDB metadata (e.g. production studio = Marvel vs DC) against its folder; flag mismatches. **Ignore = persist to an acknowledged list** ("lock in place") so it's treated as intentional and never re-flags. Respects that the user's organization choices are deliberate.

**Add category** — create the Sonarr root folder / library path for the chosen NAS folder and trigger a scan; categories then flow from real folders.

**Universal safety rules:** management-only (no playback); **confirm before execute**; every destructive action → **Recycle Bin**, never hard-delete; verify-before-delete on swaps; flag-only + user-approval for quality/releases/health.

---

## 9. Remote access & auth (required in build)

- **Remote reach:** default **Tailscale** (NAS + phone on a private mesh; nothing exposed publicly). Alternatives: **Cloudflare Tunnel + Access** (public URL with Google gate at the edge) or **Synology reverse proxy + DDNS + Let's Encrypt**.
- **Login:** **Firebase Authentication (Google provider)** with an **allow-list** of permitted accounts. Show "Continue with Google"; reject others.
- **PWA:** manifest + service worker for add-to-home-screen, fullscreen, icon. Google login and Web Speech both work under the PWA (Chrome engine) — this is why we avoid raw-WebView APKs.
- Hardening: DSM 2FA, firewall/geo-allow-list, change DSM default ports, keep Sonarr/qBittorrent/orchestrator admin UIs LAN-only or behind the proxy, service-account JSON in a read-only secrets mount.

---

## 10. Firestore data model (starting point)

```
inventory/{mediaId}          {mode, cat, type, title, year, tmdbId, tvdbId, sonarrId,
                              path, quality, seasonsOnDisk, missingCount, subTH, posterUrl, lastScanned}
features/state               {grab, subs, quality, releases, dup, corrupt, organize}   # master switches
catCfg/{mode:cat}            {grab, subs, quality, releases, dup, corrupt, organize}   # incl. mode:All scope
health/{id}                  {kind:dup|corrupt|organize, title, mode, cat, detail, status}
acknowledged/subsIgnored/{id}      true
acknowledged/organizeIgnored/{id}  true
deckMemory/{id}              {role:user|ai, text, checked[], action, ts}
notifications/{id}           {mediaId, title, event, episode, ts, delivered, seen}
jobs/{id}                    {type, payload, status, createdAt, result}   # Claude Code desktop queue
downloadStatus/{extId}       {title, state:downloading|completed|failed, dest, pct, ts}  # mirror of DS API
```

Rules: caching scanners write once (respect free-tier quotas); the browser talks only to the dashboard's own backend (which holds the service account) — never the service account directly.

---

## 11. Deployment (Docker on DSM)

- Container Manager (DSM 7.2) supports docker-compose "Projects". Store configs under `/volume1/docker/<app>`; single shared `/volume1/data` volume (TRaSH layout) mounted into Sonarr + download client so hardlinks/atomic moves work.
- **Ports** (avoid DSM reserved 5000/5001/6690/80/443/6881): Sonarr 8989, Prowlarr 9696, qBittorrent 8080, ntfy 9999→80, dashboard 3000, orchestrator (no exposed port). Verify with `sudo netstat -tulpn | grep LISTEN`.
- Dedicated `dockerlimited` user for PUID/PGID owning `data`/`docker` shares.
- `restart: unless-stopped` on everything so it survives NAS reboots and desktop-off states.
- A working example compose (sonarr, prowlarr, qbittorrent, ntfy, orchestrator, dashboard) is in the research notes; adapt PUID/PGID/paths to the live system. **Verify current DSM/NGINX/port/path config before running anything** (Max's standing rule).

---

## 12. Claude Code integration (desktop)

- Invoked headless (`claude -p`) for messy jobs Sonarr/TMDB can't auto-resolve (ambiguous names, odd folder structures, "these files are the same episode", targeted torrent adds).
- **Pattern:** dashboard/orchestrator writes a job to `jobs/` → a **desktop poller** (scheduled task) watches for `status:pending` → when the desktop is on, runs `claude -p` with a scoped prompt + allowed tools (Read/Edit/Bash) + mapped-drive paths → writes result back → fires ntfy.
- **Honest limits:** desktop must be on for jobs to run (they queue and execute on wake); keep jobs bounded (sort *this* folder, match *these* files) — never hand it the whole 12 TB library. Auth via `CLAUDE_CODE_OAUTH_TOKEN` (subscription) or `ANTHROPIC_API_KEY`.

---

## 13. Build order (phased)

1. **[turnkey] NAS prep** — Container Manager, `data` share + subfolders, `dockerlimited` user, SSH, port check.
2. **[turnkey] Core containers** — Sonarr, Prowlarr, download client (Download Station default / qBittorrent fallback), ntfy. Verify each UI.
3. **[turnkey] Sonarr** — root folders, download client (+category), TRaSH quality/naming (Recyclarr), import 12 TB library, tags per category, anime series → Anime type.
4. **[turnkey] ntfy + Sonarr connection** — topic, phone subscribe, On Grab/On Import.
5. **[turnkey] Firebase** — Firestore + service account (read-only secrets mount).
6. **[custom] Inventory scanner** — walk `T:`/`M:`, resolve movies via TMDB, read Sonarr `/api/v3/series`, write `inventory/`; cache; scheduled.
7. **[custom] Orchestrator + Deck API** — apply `features × catCfg` to Sonarr; run the seven capabilities per §8; Download Station status mirror; conditional/actionable ntfy; Deck endpoint (Anthropic key, memory, pre-answer checks, action set).
8. **[custom] Dashboard PWA** — build to `mediadeck.jsx`: all tabs, detail sheet, Settings two-tier model, Schedules live projection, Deck chat with voice, real TMDB posters (cached), Firestore-backed state + ignore lists. Manifest + service worker.
9. **[custom] Claude Code job poller** — desktop watcher for `jobs/`.
10. **[turnkey] Remote access + auth** — Tailscale (or Cloudflare/reverse proxy) + Firebase Auth (Google, allow-list) + hardening.

**Turnkey vs custom:** ~Steps 1–5 are off-the-shelf (Sonarr/Prowlarr/download client/ntfy/Firestore). The genuinely custom parts are the inventory index, the two-tier feature/category state, the orchestrator + capability behaviors (safe-swap, subtitle naming, flag-only, ignore lists, dedupe, corruption, organization), the PWA dashboard, Deck, and the Claude Code poller. No off-the-shelf tool implements the two-tier toggle model or Deck as specified.

---

## 14. Non-negotiables checklist

- [ ] Management only — **no playback** anywhere (DS Video Station owns that).
- [ ] Always-on backend on the NAS; works with the desktop off.
- [ ] Real TMDB posters, cached; TVDB stays Sonarr's TV source.
- [ ] Two-tier activation: **master AND category**; everything off by default; pending state honored.
- [ ] Quality/releases/health are **flag-only**; user approves; **Recycle Bin**, verify-before-delete, never hard-delete.
- [ ] Thai subs: same dir, exact title + `.th.srt`; honest "unavailable"; ignore list persists.
- [ ] Deck: NAS-run, persistent memory (+NAS backup), pre-answer Download Station + memory + index checks, provenance, confirm-before-execute, short answers, voice, respects ignored/disabled state.
- [ ] Duplicate/corruption/organization scans per §8; organization **Ignore = lock in place** persisted.
- [ ] PWA + Firebase Auth (Google, allow-list) + Tailscale; no raw-WebView APK.
- [ ] Confirm current DSM/NGINX/port/path config before running commands; pre-warn on port conflicts/overwrites.

---

*Front-end truth = `mediadeck.jsx`. This document = behavior, architecture, and backend contracts. Build to both.*
