# MediaDeck — Synology NAS Deployment Runbook

Deploy MediaDeck on your Synology (DSM 7.2, static IP `192.168.0.100`). The app + its Docker
stack are built here; **you run one script on the NAS.** Everything starts in safe **mock**
mode and boots even before you add a single credential — then you go live adapter by adapter.

> **Standing rule:** verify current DSM / ports / paths before running anything, and pre-warn on
> port conflicts or overwrites. This runbook checks ports for you, but sanity-check your box.

---

## 0. Prerequisites (one-time NAS prep)

1. **Container Manager** installed (DSM Package Center) — provides Docker + compose "Projects".
2. **SSH** enabled (Control Panel → Terminal & SNMP) so you can run the setup script.
3. A **shared folder `data`** on `volume1` (Control Panel → Shared Folder). This is the single
   TRaSH `/data` volume — Sonarr, the download client, the orchestrator, and the scanner all
   mount it at the **same path** so hardlinks/atomic moves work. **A single mismatched path
   silently breaks hardlinks (double disk usage)** — keep them identical.
4. A dedicated **`dockerlimited`** user owning the `data` share; note its **PUID/PGID**
   (`id dockerlimited` over SSH). Put these in `deploy/.env` (`PUID`/`PGID`).
5. Sub-folders (the setup script creates these, but you can pre-make them):
   `data/media/tv`, `data/media/movies`, `data/downloads`, `data/mediadeck`.

Ports used (all avoid DSM reserved 5000/5001/80/443/6690/6881): **8989** Sonarr, **9696**
Prowlarr, **8080** qBittorrent (fallback), **9999** ntfy, **3000** dashboard. The orchestrator
has no host port (the dashboard proxies to it internally). Verify nothing else is on these:
`sudo netstat -tulpn | grep LISTEN`.

---

## 1. Get the code onto the NAS

```bash
ssh dockerlimited@192.168.0.100
cd /volume1/docker            # or wherever you keep app configs
git clone <this-repo> mediadeck && cd mediadeck
```

## 2. Configure secrets (never committed)

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env              # fill in what you have; leave the rest blank (stays mock)
```

Set at minimum `DATA_ROOT=/volume1/data`, `PUID`/`PGID`, and `TZ`. Add keys as you get them —
each adapter goes live only when you set its `*_MODE=real` **and** its credentials (otherwise it
safely falls back to mock and logs a warning).

## 3. Bring the stack up (the one command)

```bash
bash deploy/setup.sh
```

This verifies Docker, ensures the `/data` layout, checks ports, builds the three MediaDeck
images (orchestrator, scanner, dashboard) and pulls Sonarr/Prowlarr/ntfy, starts everything with
`restart: unless-stopped`, and waits for health.

Open **`http://192.168.0.100:3000`** → the MediaDeck PWA. On your phone, use the browser's
**Add to Home Screen**.

---

## 4. Go live, one engine at a time

Each is independent; the app keeps working as you connect them.

### 4a. Sonarr (TV) — port 8989
1. Open `http://192.168.0.100:8989`, complete first-run.
2. **Settings → Media Management**: add root folder `/data/media/tv`.
3. **Settings → General**: copy the **API key** → `deploy/.env` `SONARR_API_KEY`, set `SONARR_MODE=real`.
4. Import your 12 TB library; tag series per category; set anime series to **Anime** type
   (absolute numbering). TVDB stays Sonarr's source (Skyhook) — don't swap it for TMDB.
5. Optional: TRaSH quality/naming via **Recyclarr**.

### 4b. Prowlarr (indexers) — port 9696
Add your indexers; connect Prowlarr → Sonarr (it pushes them). Copy its API key →
`PROWLARR_API_KEY`, `PROWLARR_MODE=real`.

### 4c. Download client
- **Download Station (default):** set `DOWNLOADSTATION_MODE=real` + `DOWNLOADSTATION_URL`/user/pass.
  **DSM 7.2 quirk:** log into DSM once **as the exact user Sonarr connects as**, set that user's
  Download Station **default destination**, and give Sonarr the **shared-folder-relative** dir
  (no leading `/`). If it still fails, fall back to qBittorrent.
- **qBittorrent (fallback):** start it with `docker compose --profile fallback up -d qbittorrent`
  (port 8080), category `tv-sonarr`, then point Sonarr at it. Set `QBITTORRENT_MODE=real`.

### 4d. TMDB (posters/movies)
Put your **v4 Read Access Token** in `TMDB_READ_TOKEN`, `TMDB_MODE=real`. Used as
`Authorization: Bearer`. Posters are cached locally under `data/mediadeck/cache/posters`.

### 4e. ntfy (push) — port 9999
Subscribe the **ntfy phone app** to your topic (`NTFY_TOPIC`). Set `NTFY_MODE=real`,
`NTFY_URL=http://ntfy:80`. Sonarr also has native ntfy (On Grab / On Import) if you want it.

### 4f. Deck (AI)
Add your **Anthropic API key** → `ANTHROPIC_API_KEY`, `DECK_MODE=real` (model `claude-sonnet-5`,
override via `DECK_MODEL`). Until then Deck runs in mock mode with canned replies.

After editing `deploy/.env`, apply with `docker compose up -d` (recreates changed services).

---

## 5. Firestore (optional cloud brain)

To move state to Firestore instead of local SQLite:
1. Create a Firebase project + a **service-account JSON** (Firestore + Auth).
2. Put the JSON on the NAS, e.g. `deploy/secrets/firebase-service-account.json` (git-ignored).
3. In `deploy/docker-compose.yml`, uncomment the orchestrator's secret volume mount.
4. In `deploy/.env`: `STORAGE_BACKEND=firestore`, `FIREBASE_PROJECT_ID=...`,
   `FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/firebase-service-account.json`.
5. `docker compose up -d orchestrator`. The browser never sees the service account — only the
   orchestrator does. Spark (free) tier suffices for one user (scanners write once).

---

## 6. Remote access + auth (required for real use)

- **Tailscale (recommended):** install the Synology Tailscale package; join your tailnet; reach
  `http://<nas-tailscale-ip>:3000` from your phone. Nothing exposed publicly.
  Alternatives: Cloudflare Tunnel + Access, or DSM reverse proxy + DDNS + Let's Encrypt.
- **Firebase Auth (Google, allow-list):** set `AUTH_MODE=real` and `FIREBASE_AUTH_ALLOWLIST` to
  your permitted email(s). *(The PWA's Google sign-in gate + server allow-list check is wired for
  phase-10; until then AUTH_MODE=mock lets you in.)*
- **PWA + auth needs a secure context** (HTTPS or `localhost`). Over plain `http://…:3000` the
  service worker install and Google redirect can misbehave — front the dashboard with the DSM
  reverse proxy + a Let's Encrypt cert, or use the Tailscale HTTPS cert.
- **Hardening:** DSM 2FA, firewall/geo allow-list, change DSM default ports, keep Sonarr/
  qBittorrent admin UIs LAN-only or behind the proxy, service-account JSON read-only.

---

## 7. Claude Code desktop poller (optional)

For messy file-sorting / torrent-add jobs the automations can't resolve. On your Windows desktop
(with the mapped drives `T:`/`M:` and Claude Code installed + authenticated):

```
pnpm --filter @mediadeck/poller build
set ORCH_PUBLIC_URL=http://192.168.0.100:4000 && set POLLER_MODE=real
tools\poller\mediadeck-poller.cmd        # or register as a Scheduled Task "At log on"
```

Jobs queue on the NAS and run when the desktop is on. See `tools/poller/README.md`.

---

## 8. Day-2

```bash
docker compose ps                 # status
docker compose logs -f orchestrator dashboard scanner
docker compose up -d              # apply .env changes / update
docker compose pull && docker compose up -d   # update off-the-shelf images
```

Verify hardlinks work (same filesystem, same mount): a Sonarr import should hardlink from
`/data/downloads` into `/data/media/...` without copying. If disk usage doubles, a mount path is
mismatched — fix it before importing the full library.
