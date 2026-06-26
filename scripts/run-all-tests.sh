#!/usr/bin/env bash
# Run all tests available in this environment (coordinator backend)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== George Orchestra — Run All Tests ==="

bash scripts/check-deps.sh
npm run typecheck
npm test
npm run orchestra:health
npm run george:prepare

echo ""
echo "All available tests PASSED."
echo ""
echo "NOTE: APK build requires George (Personal_caledar) on Windows."
echo "Run on your PC: npm run george:full-deploy"
