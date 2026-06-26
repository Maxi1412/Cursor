#!/usr/bin/env bash
# Check dependencies for George Orchestra (Linux / CI / cloud coordinator)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

check() {
  if command -v "$1" &>/dev/null; then
    echo "  OK   $1 ($($1 --version 2>&1 | head -1))"
  else
    echo "  MISS $1"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Orchestra Coordinator Dependencies (Linux) ==="
check node
check npm
check git

NODE_VER=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_VER" -lt 18 ]; then
  echo "  WARN Node 18+ required (found: $(node -v 2>/dev/null || echo none))"
  ERRORS=$((ERRORS + 1))
fi

if [ -d "$ROOT/node_modules" ]; then
  echo "  OK   node_modules installed"
else
  echo "  MISS node_modules — run: npm install"
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$ROOT/.env" ]; then
  echo "  OK   .env exists"
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  [ -n "${FIREBASE_PROJECT_ID:-}" ] && echo "  OK   FIREBASE_PROJECT_ID set" || echo "  WARN FIREBASE_PROJECT_ID not set"
else
  echo "  WARN .env missing — copy .env.example"
fi

echo ""
echo "=== George APK Build Dependencies (Windows only) ==="
echo "  These are checked by check-deps.ps1 on your PC:"
echo "  - Java JDK 17+, Android SDK, ANDROID_HOME"
echo "  - George project at Personal_caledar/"
echo "  - K: Google Drive (maxscheurer85@gmail.com) Application Projects/personal calendar/"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS dependency issue(s)" >&2
  exit 1
fi

echo ""
echo "All coordinator dependencies OK."
