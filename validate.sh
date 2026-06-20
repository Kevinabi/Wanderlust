#!/usr/bin/env bash
# ─── Wanderlust validation gate ──────────────────────────────────────────────
# The single quality gate the agent loop and CI both run. Fails fast on the
# first broken step so nothing half-baked reaches production.
#
# Usage:
#   bash validate.sh          # lint + unit tests + build  (fast, no browsers)
#   bash validate.sh --full   # also runs Playwright E2E    (needs browsers)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }

step "1/4  Lint (eslint)"
npm run lint
ok "lint passed"

step "2/4  Unit tests (vitest)"
npm run test
ok "unit tests passed"

step "3/4  Production build (vite build)"
npm run build
ok "build succeeded"

if [[ "${1:-}" == "--full" ]]; then
  step "4/4  E2E smoke (playwright)"
  npm run test:e2e
  ok "e2e passed"
else
  printf "\n\033[0;33m(skipping E2E — pass --full to include Playwright)\033[0m\n"
fi

printf "\n\033[1;32m✅ All checks green — safe to deploy.\033[0m\n"
