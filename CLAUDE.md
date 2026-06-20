# Wanderlust — Project Context

> This file is the agent's source of truth. Read it before making changes.
> It gives any AI agent (or new contributor) the full picture so a "build from
> context → test → validate → deploy" loop has real context to work from.

## What this is

Wanderlust is a travel-booking web app (an Indian-market travel planner, MakeMyTrip-style).
The flagship working feature is the **Trains** module, backed by the IRCTC1 RapidAPI:
search trains between stations, check PNR status, and track live train status.
Other categories (flights, hotels, buses, etc.) are UI scaffolding with static datasets.

## Stack

- **Frontend:** React 19 + Vite 8. Single-page app, entry `src/App.jsx`.
- **Backend (prod):** Vercel serverless functions in `api/` (Node 20).
- **Backend (local dev):** Express `server.js` — mirrors the same endpoints.
- **Shared logic:** `api/_lib/irctc.js` — the single source of truth for API
  fetching + response normalization, imported by BOTH the serverless functions
  and the Express dev server. Edit logic here, never duplicate it.
- **Tests:** Vitest (unit, `tests/`) + Playwright (E2E smoke, `e2e/`).
- **Hosting:** Vercel. CI/CD via GitHub Actions (`.github/workflows/ci.yml`).

## Architecture map

```
src/App.jsx              # entire UI (components inlined: CityPicker, SearchForm,
                         #   TrainLiveStatus, PNRStatus). API_BASE auto-switches
                         #   dev(localhost:3001) ↔ prod(/api).
api/
  _lib/irctc.js          # irctcFetch + normalizeTrainsBetween / LiveStatus / Pnr
  health.js              # GET /api/health
  trains-between.js      # GET /api/trains-between?from=&to=&date=
  live-status/[trainNumber].js   # GET /api/live-status/:trainNumber?startDay=1
  pnr/[pnrNumber].js     # GET /api/pnr/:pnrNumber
server.js                # local Express dev server (same routes, same _lib)
tests/normalizers.test.js  # unit tests for the pure normalizers
e2e/smoke.spec.js        # Playwright UI smoke tests
vercel.json              # build + functions + SPA rewrite config
validate.sh              # the quality gate (lint + test + build [+ --full e2e])
```

## API contract (must stay stable — the frontend depends on these shapes)

- `GET /api/trains-between?from=NDLS&to=MAS&date=2026-06-20` → `{ trains: [...], total }`
- `GET /api/live-status/:trainNumber?startDay=1` → normalized live-status object
- `GET /api/pnr/:pnrNumber` (10 digits) → normalized PNR object
- `GET /api/flights-search?fromCode=DEL&toCode=BOM&date=2026-07-01` → `{ flights: [...], total }` (Sky-Scrapper)
- `GET /api/hotels-search?city=Goa&checkin=2026-07-01&checkout=2026-07-02&guests=2` → `{ hotels: [...], total }` (Sky-Scrapper)
- `GET /api/health` → `{ status, api, keySet, time }`

Validation rules: train number 4–5 digits, PNR exactly 10 digits, trains-between
requires from+to+date. Keep these in sync between `api/` and `server.js` (both use `_lib`).

## Conventions

- ES modules everywhere (`"type": "module"`).
- All IRCTC network + mapping logic lives in `api/_lib/irctc.js`. Route handlers
  stay thin: validate input → `irctcFetch` → `normalize*` → respond.
- Secrets come from env only. `RAPIDAPI_KEY` is required; never hard-code it.
  Never commit `.env` (it is gitignored; `.env.example` documents the keys).
- Frontend never hard-codes the API origin — it uses `API_BASE`.

## Commands

```bash
npm install            # install deps
npm run dev:all        # run vite + express together (local dev)
npm run lint           # eslint
npm run test           # vitest unit tests
npm run test:e2e       # playwright smoke (needs: npx playwright install)
npm run build          # production build → dist/
npm run validate       # THE GATE: lint + test + build (fast)
bash validate.sh --full # gate + e2e
```

## The agentic build loop

When asked to add or change a feature, follow this loop:

1. **Context** — read this file + the relevant source (`src/App.jsx`, `api/`).
2. **Build** — make the change. Keep API shapes stable or update tests + frontend together.
3. **Validate** — run `npm run validate` (or `bash validate.sh --full`). Read failures, fix, repeat until green.
4. **Deploy** — commit to a branch, open a PR. CI runs the gate. Merge to `main`
   only when green; merging to `main` auto-deploys to Vercel production.

Never deploy on a red gate. If the gate cannot pass, stop and report why.

## Known limitations

- IRCTC free tier = 100 requests/day; station-level ETA needs the paid tier.
- Non-train categories use static data (no live pricing/booking yet).
