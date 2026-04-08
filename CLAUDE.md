# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository scope

This directory is **not the application source** — it only contains:

- `e2e/` — Playwright end-to-end tests that drive the app over HTTP at `http://localhost:8081`.
- `init.sql` — ~140 MB database seed dump loaded into the backing database before e2e runs.
- `UNI_Scenario_227_MP_Heuristics_Result (data).xlsx` — source data the seed is derived from.

The frontend/backend code under test lives elsewhere. The app must already be running on `localhost:8081` (with the DB seeded from `init.sql`) before the tests will pass.

## Commands (run inside `e2e/`)

- `yarn test` — run the full Playwright suite (chromium only, `fullyParallel: false`, 1 retry).
- `yarn test:headed` — same, with a visible browser.
- `yarn test:debug` — Playwright inspector.
- `yarn test:report` — open the last HTML report.
- Run a single file: `yarn test tests/05-factory-card.spec.ts`
- Run a single test by title: `yarn test -g "factory card opens"`

Use `yarn`, not `npm` (per global rules). Do not `brew install` anything.

## Test architecture

- `tests/*.spec.ts` are numbered by feature area (page load, CSKU filter, time-bucket slider, map routes, factory/warehouse/route detail cards, total info, API endpoints, slider→map reactivity).
- `tests/helpers.ts` is the single source of DOM/interaction knowledge — **always extend it rather than hardcoding selectors in specs**. It encodes everything the tests know about the app's UI contract:
  - **Map**: Leaflet (`.leaflet-container`, `.leaflet-marker-icon`, `.leaflet-overlay-pane path`). `waitForMap` waits for tiles.
  - **Marker colors are the type discriminator**: factories = `#3b82f6` (blue), warehouses = `#10b981` (green, label contains `Stock:`), active routes = `stroke="#1f2937"`. Tests identify marker types by scanning innerHTML for these hex codes.
  - **Detail card tabs**: factories expose a `Productions` tab; warehouses expose `Resource Balance` but no `Productions` tab — this is how `clickWarehouseMarker` disambiguates.
  - **CSKU filter**: `input[placeholder="Search CSKU..."]`, selection triggers a `/api/map-data` response that tests await via `page.waitForResponse`.
  - **Time-bucket slider**: a native `input[type="range"]` driven by a React controlled component. `setTimeBucketIndex` must use the `HTMLInputElement.prototype` value setter + dispatch both `input` and `change` events, otherwise React ignores the update.
  - Selected CSKU badge: `span.font-mono.bg-blue-100`. Current bucket label: `span.font-mono.text-gray-600`. Detail header: `.font-medium.text-sm.text-gray-900`. Close button text: `×`.
- API contract touched by tests: `/api/map-data` (and other `/api/*` endpoints exercised in `09-api-endpoints.spec.ts`).
- `fullyParallel: false` — tests share the single backend instance and its DB state, so do not switch to parallel workers without isolating state first.
