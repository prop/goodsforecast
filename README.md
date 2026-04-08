# Supply Chain Heuristics

Interactive web application that visualizes a logistics / production plan from an Excel-derived PostgreSQL dump. Built as a yarn-workspaces monorepo with a NestJS API, an Angular 18 frontend, PostgreSQL, and a Playwright end-to-end test suite — all wired together via Docker Compose.

The app lets you pick a CSKU (product), scrub through weekly time buckets with a slider, and watch stocks, productions, and movements update on a map of Russia in real time. Clicking any factory, warehouse, or active route opens a detail card with the underlying rows.

## Quick start

```bash
# 1. Bring the whole stack up (postgres + api + web on :8081)
docker compose up --build -d

# 2. Run the e2e suite against it
cd e2e
yarn install           # first time only
yarn test              # 53 passed, 3 skipped
```

Then open [http://localhost:8081](http://localhost:8081). Any non-empty email/password will sign you in (demo auth).

To tear everything down (including the postgres volume):

```bash
docker compose down -v
```

## Architecture

```
┌─────────────────┐       ┌──────────────┐       ┌─────────────┐
│  Angular 18     │──/api │  NestJS 10   │──pg──▶│ Postgres 16 │
│  + Tailwind     │──────▶│  (raw pg)    │       │ init.sql    │
│  + Leaflet      │       │              │       │             │
│  (nginx :80)    │       │  :3000       │       │  :5432      │
└─────────────────┘       └──────────────┘       └─────────────┘
      host :8081
```

- **Nginx** in the `web` container serves the built Angular app and reverse-proxies `/api/*` to the `api` container on the internal docker network. Only port `8081` is exposed to the host — everything the browser and the Playwright tests need lives behind a single origin.
- **Postgres** auto-loads `init.sql` on first start via `/docker-entrypoint-initdb.d/`. The volume persists between runs; use `docker compose down -v` to wipe it.
- **NestJS** talks to postgres via raw `pg` (no ORM) — the init dump is the schema of record and there are no migrations. A small `DbService` wraps a single `Pool` with a startup retry loop so the API waits for postgres to become ready.
- **Angular** is a standalone-components app with signal-based state, bootstrapped via `bootstrapApplication`. Map rendering uses Leaflet directly (no `ngx-leaflet`) with DivIcons for markers and labels.

### API endpoints

All endpoints are mounted under `/api` and are unauthenticated (the auth gate is frontend-only, by design).

| Method | Path | Query params | Purpose |
|---|---|---|---|
| `GET` | `/api/locations` | — | 12 locations (factories + warehouses) with coordinates |
| `GET` | `/api/time-buckets` | — | Weekly buckets sorted by `sort_order` |
| `GET` | `/api/cskus` | — | Distinct product groups (`CSKU…`) found in `resource_balance` |
| `GET` | `/api/total-info` | — | KPI rows for the Total Info panel |
| `GET` | `/api/map-data` | `csku`, `tb` | Per-location stock / production / dim state, plus routes with `currentQuantity` summed over `departure_bucket = tb`. Returns `400` if params are missing. |
| `GET` | `/api/resource-balance` | `csku`, `warehouse`, `tb` | BEGIN/END rows for a warehouse card |
| `GET` | `/api/movements` | `csku`, `from`, `to`, `tb` | Movement rows for a route card |
| `GET` | `/api/final-productions` | `csku`, `factory`, `tb` | Production rows for a factory card |
| `GET` | `/api/factory-load` | `factory`, `tb` | `{ workcenterLoad, secondaryResourceLoad }` for factory card tabs |
| `POST` | `/api/auth/login` | body `{email, password}` | Returns a fake token for any non-empty credentials |

### Frontend structure

| File | Responsibility |
|---|---|
| `apps/web/src/app/app.component.ts` | Top-level layout; owns `selectedCsku`, `selectedTbIndex`, `selectedEntity` signals; re-fetches `/api/map-data` via an `effect` whenever both `csku` and `tb` are set; gates on `AuthService.isAuthenticated()`. |
| `auth.service.ts` + `login.component.ts` | Fake auth: persists a token in `localStorage`, login form accepts any non-empty credentials. |
| `map.component.ts` | Leaflet map, OSM tiles, DivIcon markers for factories (blue `#3b82f6`) and warehouses (green `#10b981`, labelled `Stock: …`), `L.polyline` routes in `#1f2937` (active) or `#9ca3af` (dashed, dormant). Dimmed factories carry `opacity: 0.5` when the selected CSKU has no production there. |
| `csku-picker.component.ts` | Click-to-open autocomplete with a 100-item cap and a "No results" empty state. |
| `time-slider.component.ts` | Native `<input type="range">` with a `W.XX.YYYY` label. |
| `total-info.component.ts` | Collapsible KPI panel, always visible on the right. |
| `detail-card.component.ts` | Switches between factory (4 tabs), warehouse (Resource Balance only), and route (Movements only) presentations. |

## Project layout

```
goodsforecast/
├── apps/
│   ├── api/                    NestJS service (raw pg, no ORM)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── db/db.service.ts
│   │   │   └── modules/
│   │   │       ├── api.controller.ts
│   │   │       ├── api.service.ts
│   │   │       └── auth.controller.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    Angular 18 standalone + Tailwind + Leaflet
│       ├── src/
│       │   ├── index.html
│       │   ├── main.ts
│       │   ├── styles.css
│       │   └── app/
│       │       ├── app.component.ts
│       │       ├── api.service.ts
│       │       ├── auth.service.ts
│       │       ├── login.component.ts
│       │       ├── map.component.ts
│       │       ├── csku-picker.component.ts
│       │       ├── time-slider.component.ts
│       │       ├── total-info.component.ts
│       │       ├── detail-card.component.ts
│       │       └── types.ts
│       ├── nginx/default.conf  SPA fallback + /api proxy
│       ├── angular.json
│       ├── tailwind.config.js
│       └── Dockerfile
├── e2e/                        Playwright suite (owns its own CLAUDE.md)
│   └── tests/
│       ├── fixtures.ts         pre-seeds auth token for existing specs
│       ├── 00-auth.spec.ts     exercises the real login form
│       └── 01-…-10-*.spec.ts   feature specs from the original contract
├── init.sql                    ~140 MB seed dump, auto-loaded by postgres
├── docker-compose.yml
├── tsconfig.base.json
└── package.json                yarn workspaces root
```

## End-to-end tests

The `e2e/` workspace is the **source of truth for the UX contract** — every selector, every DOM shape, every API query parameter is pinned there. Read `e2e/CLAUDE.md` for the full conventions. Key points:

- **Pre-seeded auth**: `e2e/tests/fixtures.ts` injects a fake `auth-token` into `localStorage` via `page.addInitScript` before each test, so feature specs land directly on the main app. Only `00-auth.spec.ts` imports from `@playwright/test` directly — it exercises the real login form.
- **Single backend, shared state**: `playwright.config.ts` runs chromium-only, `fullyParallel: false`, 1 retry. Tests hit the same postgres, so don't introduce state-mutating operations.
- **Run a single file**: `yarn test tests/05-factory-card.spec.ts`
- **Run by title**: `yarn test -g "factory card opens"`
- **See the report**: `yarn test:report`

Expected result: **53 passed, 3 skipped, 0 failed** in ~45s. The 3 skips are `test.skip()` branches inside the helpers for cases where factory markers overlap warehouse markers at shared coordinates (e.g. Z013/Z233_ZI01 in Тула, Z107/Z007 in Омск) — they're intentional, not gaps.

## Development notes

### Without Docker

You can also run the pieces locally, assuming postgres is running somewhere reachable:

```bash
# Create and seed the database manually
createdb goodsforecast && psql goodsforecast < init.sql

# API
cd apps/api && yarn install && yarn dev       # :3000

# Web (dev server on :4200, proxy /api → :3000 via angular.json if added)
cd apps/web && yarn install && yarn start
```

For e2e runs the web app must be reachable at `http://localhost:8081` because that's hardcoded in `playwright.config.ts` and `09-api-endpoints.spec.ts`. The docker-compose setup handles this; for a non-docker dev loop you'd need a local nginx or similar.

### Rebuilding a single container after code changes

```bash
docker compose up -d --build --no-deps api        # or web
docker compose up -d --force-recreate --no-deps api
```

### Conventions

- TypeScript is `strict: true` everywhere. Interfaces are `I`-prefixed, types are `T`-prefixed (per the global style rules in `CLAUDE.md`).
- No ORM on the backend — `init.sql` is the authoritative schema and no migrations are generated from code.
- The CSKU badge, the time-bucket label, the detail card headers, and the "No results" empty state are all load-bearing selectors for Playwright. If you change any of them, run the suite before committing.

## License

Private / unlicensed — internal project.
