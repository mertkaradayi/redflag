# RedFlag

RedFlag monitors new Sui smart-contract deployments, persists on-chain metadata to Supabase, runs Gemini-powered risk analysis, and presents the results in a React 19 dashboard.

## Monorepo Layout

```
.
├── frontend/
│   ├── app/components/          # shared UI building blocks
│   ├── app/dashboard/           # dashboard route, types, utilities
│   ├── app/providers.tsx        # global providers (Privy, theme, data)
│   └── ...
├── backend/
│   ├── src/index.ts             # Express entrypoint & routing
│   ├── src/lib/                 # Supabase, Sui, LLM integrations
│   └── src/workers/             # background monitors
├── llm/                         # prompt experimentation & research notes
├── package.json                 # workspace scripts
└── yarn.lock
```

The frontend uses the `@/` alias (rooted at `frontend/`) for cross-module imports. Shared providers live in `frontend/app/providers.tsx`.

## Features

### Backend services (Express + Supabase + Sui)

- Configurable CORS-protected Express API served from `backend/src/index.ts`.
- Background worker (`startMonitoring`) polls the Sui RPC (`POLL_INTERVAL_MS`, default 15s), stores new deployments in Supabase, and triggers LLM analysis for unseen packages.
- Gemini 2.5 Flash chain (Analyzer → Scorer → Reporter) with automatic fallback API key rotation and retry/backoff logic.
- Supabase persistence for both raw deployment metadata (`sui_package_deployments`) and generated safety cards (`contract_analyses`).
- JSON REST endpoints for health checks, Sui telemetry, LLM analysis, and monitor status.

### Frontend dashboard (Next.js 16 / React 19)

- App Router experience with type-safe server components and Tailwind CSS v4 via `@tailwindcss/postcss`.
- Dashboard (`/dashboard`) auto-refreshes every 30 seconds, caches the latest run, and supports risk-level filtering (critical → low).
- UI primitives under `frontend/app/components` (e.g., `AnalyzedContractCard`) and shadcn-inspired utilities under `frontend/app/components/ui`.
- Privy authentication scaffolding (via `@privy-io/react-auth`) with providers configured in `app/providers.tsx`.

## Requirements

- Node.js 20.x (Next.js 16 and React 19 require ≥18.18; we target 20 LTS).
- Yarn Classic (1.22+) with workspaces enabled.
- A Supabase project (PostgreSQL) for storing deployments and analyses.
- Google Generative AI API key(s) for Gemini (`GOOGLE_API_KEY`, optional fallback `GOOGLE_API_KEY_FALLBACK`).
- Sui RPC endpoint (defaults to `https://fullnode.testnet.sui.io:443`).
- Privy application ID when enabling authentication flows.

## Getting Started

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Configure environment variables**

   - Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env.local`.
   - Update the values to match the tables below. Older templates may reference `MONITORING_INTERVAL_MS`; rename it to `POLL_INTERVAL_MS` to align with the worker configuration.

3. **Run the stack locally**

   ```bash
   yarn dev
   ```

   This starts Next.js on port 3000 and Express on port 3001 via `concurrently`.

4. **Verify services**

   - Frontend: http://localhost:3000/
   - Backend health: http://localhost:3001/health
   - Monitor status: http://localhost:3001/api/sui/monitor-status
   - Dashboard data: http://localhost:3001/api/llm/analyzed-contracts

## Workspace Commands

- `yarn dev` – run frontend and backend together.
- `yarn dev:frontend` / `yarn dev:backend` – focus on a single service.
- `yarn build` – run production builds for both workspaces.
- `yarn build:frontend` / `yarn build:backend` – per-service builds.
- `yarn workspace frontend lint` – Next.js core-web-vitals linting (treat warnings as actionable).

## Environment Variables

### Backend (`backend/.env`)

| Key | Required | Description | Default |
| --- | --- | --- | --- |
| `PORT` | No | HTTP port for the Express server. | `3001` |
| `NODE_ENV` | No | Runtime environment flag surfaced in `/api/status`. | `development` |
| `FRONTEND_URL` | Yes | Allowed origin for CORS (e.g., `http://localhost:3000`, production Vercel URL). | – |
| `SUPABASE_URL` | Yes | Supabase project URL. | – |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key for privileged queries. | – |
| `SUPABASE_ANON_KEY` | No | Optional anon key; retained for future read-only client use. | – |
| `GOOGLE_API_KEY` | Yes (for analysis) | Primary Gemini 2.5 Flash key. Required to run the analyzer and background worker. | – |
| `GOOGLE_API_KEY_FALLBACK` | No | Secondary Gemini key used automatically when the primary hits quota. | – |
| `SUI_RPC_URL` | No | Sui RPC endpoint (testnet by default). | `https://fullnode.testnet.sui.io:443` |
| `POLL_INTERVAL_MS` | No | Worker polling interval in milliseconds. | `15000` |
| `SUI_PRIVATE_KEY` | No | Optional Ed25519 private key for authenticated Sui calls. | – |

### Frontend (`frontend/.env.local`)

| Key | Required | Description | Default |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Base URL for API calls (`http://localhost:3001` locally). | – |
| `NEXT_PUBLIC_SITE_URL` | No | Public URL for the frontend, used for OpenGraph/Twitter metadata. | `http://localhost:3000` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | No | Privy application ID when enabling auth flows. | – |

## API Surface

- **Health & status**
  - `GET /health` – Aggregated service health (Supabase + Sui + timestamps).
  - `GET /api/status` – Lightweight status banner.
- **Supabase & database**
  - `GET /api/supabase/health` – Verifies Supabase client initialization.
- **Sui monitoring**
  - `GET /api/sui/recent-deployments` – Live deployments from RPC with cursor support.
  - `GET /api/sui/latest-deployment` – Single most recent deployment.
  - `GET /api/sui/deployments` – Historical deployments persisted in Supabase.
  - `GET /api/sui/health` – RPC connectivity diagnostics.
  - `GET /api/sui/monitor-status` – Background worker status + poll interval.
  - `GET /api/sui/debug` – Inspect recent transactions and published packages (development aid).
- **LLM contract analysis**
  - `POST /api/llm/analyze` – Trigger analysis for a specific `package_id` / `network` (runs Gemini if cache miss).
  - `GET /api/llm/analyze/:packageId` – Fetch stored analysis for a package + network.
  - `GET /api/llm/recent-analyses` – Paginated list of recent analyses.
  - `GET /api/llm/high-risk` – High-risk analyses (critical/high).
  - `GET /api/llm/analyzed-contracts` – Dashboard-friendly format (used by the frontend).
  - `GET /api/llm/health` – LLM configuration status + analysis count.

## Background Monitoring & Analysis

1. `startMonitoring()` (bootstrapped in `src/index.ts`) loads the last processed checkpoint from Supabase.
2. The worker polls the Sui RPC with adaptive filters, deduplicates deployments, and upserts them into `sui_package_deployments`.
3. For each new package the worker requests a Gemini safety card via `runFullAnalysisChain`.
4. Results are persisted in `contract_analyses` (idempotent upsert) and exposed through `/api/llm/*` endpoints.
5. High-risk packages are logged with elevated console output for operational awareness.

## Supabase Schema (minimum viable)

```sql
-- Enable if you prefer UUID identifiers
-- create extension if not exists pgcrypto;

create table if not exists public.sui_package_deployments (
  package_id text primary key,
  deployer_address text not null,
  tx_digest text not null,
  checkpoint bigint not null,
  timestamp timestamptz not null,
  first_seen_at timestamptz not null default now()
);

create table if not exists public.contract_analyses (
  id uuid default gen_random_uuid() primary key,
  package_id text not null,
  network text not null,
  risk_score numeric not null,
  risk_level text not null,
  summary text not null,
  why_risky_one_liner text not null,
  risky_functions jsonb default '[]'::jsonb,
  rug_pull_indicators jsonb default '[]'::jsonb,
  impact_on_user text,
  technical_findings jsonb,
  analyzed_at timestamptz not null default now(),
  unique (package_id, network)
);
```

Adjust column types as needed for your Supabase project (e.g., replace `gen_random_uuid()` with `uuid_generate_v4()` if `pgcrypto` is unavailable).

## Frontend Overview

- Pages live under `frontend/app`; the dashboard route shares types via `app/dashboard/types.ts` and helpers via `app/dashboard/risk-utils.ts`.
- `AnalyzedContractCard` renders each analyzed contract with risk badges, metadata, and detail disclosure.
- Auto-refresh logic is configurable (defaults to 30 seconds) and can be paused via the toolbar.
- Styling follows Tailwind utility grouping (layout → color → typography) and `class-variance-authority` for variants.

## Development Notes

- TypeScript is strict across services—define explicit return types in shared utilities and backend handlers.
- Frontend components use PascalCase filenames; backend modules use kebab-case (`src/lib/supabase.ts`, `src/workers/sui-monitor.ts`).
- Centralize environment access: backend reads from `process.env`, frontend from `NEXT_PUBLIC_*` keys only.
- When introducing new logic, add corresponding tests (`frontend/__tests__` with Vitest + Testing Library, `backend` API tests with Supertest) or document manual verification.
- Run `yarn workspace frontend lint` before committing; treat warnings as issues to resolve.

## Deployment

- **Frontend (Vercel)**: set `NEXT_PUBLIC_BACKEND_URL` to your deployed backend and replicate any Privy IDs. Root directory should point to `frontend` with the default Next.js build.
- **Backend (Railway or similar)**: deploy from `backend`, supply all environment variables (especially `FRONTEND_URL`) and confirm CORS origins. The worker starts automatically on boot.
- Coordinate updates so Vercel and Railway share the same allowed origins and Supabase credentials.

## Troubleshooting

- **CORS errors**: ensure `FRONTEND_URL` matches the requesting origin exactly (protocol + host + port).
- **LLM analysis skipped**: check that `GOOGLE_API_KEY` is set; the worker logs `⚠️  GOOGLE_API_KEY not configured` otherwise.
- **No deployments stored**: verify Supabase tables exist and the service role key has `insert`/`upsert` permissions.
- **Monitor idle**: inspect `/api/sui/monitor-status` and server logs; adjust `POLL_INTERVAL_MS` if rate-limited.
- **Frontend 500s**: confirm `NEXT_PUBLIC_BACKEND_URL` is reachable and HTTPS when deployed to Vercel.

## Contributing

This is a private project. Follow the workspace coding standards, prefer small focused commits, and update this README when workflows change.

## License

Private – all rights reserved.
