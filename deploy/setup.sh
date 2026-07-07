#!/usr/bin/env bash
# MediaDeck — one-command deploy for the Synology NAS (DSM 7.2, Container Manager / Docker).
# Run from the repo's deploy/ folder:  bash deploy/setup.sh
# Idempotent: safe to re-run. Verifies prerequisites, brings the stack up, waits for health.
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE=(docker compose)

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# 1. prerequisites
say "Checking prerequisites…"
command -v docker >/dev/null || die "Docker not found. Install Container Manager (DSM 7.2) and enable Docker."
docker compose version >/dev/null 2>&1 || die "docker compose v2 not available."

# 2. env
if [[ ! -f .env ]]; then
  say "No deploy/.env — creating it from .env.example. EDIT IT with your keys, then re-run."
  cp .env.example .env
  warn "Left everything in MOCK mode. Fill in TMDB/Sonarr/Anthropic/etc. in deploy/.env to go live."
fi

# 3. data layout (TRaSH single-/data — hardlinks depend on ONE shared volume)
DATA_ROOT="$(grep -E '^DATA_ROOT=' .env | cut -d= -f2- || true)"
DATA_ROOT="${DATA_ROOT:-./data}"
say "Ensuring data layout under ${DATA_ROOT} …"
mkdir -p "${DATA_ROOT}/media/tv" "${DATA_ROOT}/media/movies" "${DATA_ROOT}/downloads" "${DATA_ROOT}/mediadeck/cache/posters"

# 4. port check (best-effort)
say "Checking ports (8989, 9696, 9999, 3000)…"
for p in 8989 9696 9999 3000; do
  if command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -q ":${p} "; then
    warn "Port ${p} already in use — adjust the mapping in docker-compose.yml if this is a conflict."
  fi
done

# 5. build + start
say "Pulling base images…"
"${COMPOSE[@]}" pull --ignore-buildable 2>/dev/null || true
say "Building MediaDeck images (orchestrator, scanner, dashboard)…"
"${COMPOSE[@]}" build
say "Starting the stack…"
"${COMPOSE[@]}" up -d

# 6. health-wait on the orchestrator (via the dashboard's proxy on :3000)
say "Waiting for the dashboard + orchestrator to become healthy…"
ok=0
for i in $(seq 1 40); do
  if curl -fsS "http://localhost:3000/health" >/dev/null 2>&1 \
     || docker exec mediadeck-orchestrator wget -qO- http://localhost:4000/health >/dev/null 2>&1; then
    ok=1; break
  fi
  sleep 3
done
[[ "$ok" == 1 ]] || warn "Health check timed out — inspect logs: docker compose logs orchestrator dashboard"

say "Done."
cat <<EOF

  MediaDeck is up.
    Dashboard   → http://<nas-ip>:3000     (add-to-home-screen for the PWA)
    Sonarr      → http://<nas-ip>:8989
    Prowlarr    → http://<nas-ip>:9696
    ntfy        → http://<nas-ip>:9999

  Next: see docs/NAS-RUNBOOK.md to connect Sonarr/Prowlarr/Download Station, set up
  Tailscale + Firebase Auth, and go from mock → live by editing deploy/.env.
EOF
