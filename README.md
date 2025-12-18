# RedFlag

RedFlag monitors new Sui smart-contract deployments, persists on-chain metadata to Supabase, runs AI-powered risk analysis via OpenRouter, and presents the results in a React 19 dashboard.

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
- **Dual Network Monitors**: Two independent workers poll mainnet and testnet simultaneously with configurable intervals. Deployments are tagged with their network and stored with composite primary keys.
- **3-Agent LLM Chain** (Analyzer → Scorer → Reporter) via OpenRouter with retry/backoff logic.
- **Map-Reduce Chunked Analysis**: Large contracts with multiple modules are analyzed in parallel, then findings are aggregated. This enables analysis of contracts of any size without token limit issues.
- Supabase persistence for both raw deployment metadata (`sui_package_deployments`) and generated safety cards (`contract_analyses`).
- JSON REST endpoints for health checks, Sui telemetry, LLM analysis, and monitor status.

### Frontend dashboard (Next.js 16 / React 19)

- App Router experience with type-safe server components and Tailwind CSS v4 via `@tailwindcss/postcss`.
- Dashboard (`/dashboard`) auto-refreshes every 30 seconds, caches the latest run, and supports risk-level and **network filtering** (All/Mainnet/Testnet).
- Deployments page (`/deployments`) shows real-time deployment activity with network filter toggle.
- UI primitives under `frontend/app/components` (e.g., `AnalyzedContractCard`) and shadcn-inspired utilities under `frontend/app/components/ui`.

## Requirements

- Node.js 20.x (Next.js 16 and React 19 require ≥18.18; we target 20 LTS).
- Yarn Classic (1.22+) with workspaces enabled.
- A Supabase project (PostgreSQL) for storing deployments and analyses.
- OpenRouter API key (`OPEN_ROUTER_KEY`) - get one at https://openrouter.ai/keys.
- Sui RPC endpoints for mainnet and testnet (defaults provided).

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
| `OPEN_ROUTER_KEY` | Yes (for analysis) | OpenRouter API key for LLM analysis. Get one at https://openrouter.ai/keys. | – |
| `LLM_MODEL_ANALYZER` | No | Override the analyzer model. | `mistralai/devstral-2512:free` |
| `LLM_MODEL_SCORER` | No | Override the scorer model. | `mistralai/devstral-2512:free` |
| `LLM_MODEL_REPORTER` | No | Override the reporter model. | `mistralai/devstral-2512:free` |
| `LLM_MODEL_FALLBACK` | No | First fallback model (free). | `xiaomi/mimo-v2-flash:free` |
| `LLM_MODEL_FALLBACK2` | No | Second fallback model (paid, last resort). | `openai/gpt-oss-120b` |
| `ENABLE_AUTO_ANALYSIS` | No | Enables the background Sui monitor + automatic LLM analysis. Flip to `false` while developing UI without hitting external services. | `true` |
| `ENABLE_SUI_RPC` | No | Master kill switch for all Sui RPC calls (health checks, monitor, manual analysis). Set to `false` to avoid network calls locally. | `true` |

**Multi-Network Configuration:**

| Key | Required | Description | Default |
| --- | --- | --- | --- |
| `SUI_RPC_URL_TESTNET` | No | Sui testnet RPC endpoint. | `https://fullnode.testnet.sui.io:443` |
| `SUI_RPC_URL_MAINNET` | No | Sui mainnet RPC endpoint. | `https://fullnode.mainnet.sui.io:443` |
| `POLL_INTERVAL_MS_TESTNET` | No | Testnet polling interval in ms (faster for testing). | `15000` |
| `POLL_INTERVAL_MS_MAINNET` | No | Mainnet polling interval in ms (slower to reduce RPC load). | `30000` |

**Legacy (deprecated):**

| Key | Description |
| --- | --- |
| `SUI_RPC_URL` | Single network RPC URL. Use network-specific URLs above. |
| `SUI_NETWORK` | Single network selector. Multi-network now runs both. |
| `POLL_INTERVAL_MS` | Single polling interval. Use network-specific intervals above. |

### Frontend (`frontend/.env.local`)

| Key | Required | Description | Default |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Base URL for API calls (`http://localhost:3001` locally). | – |
| `NEXT_PUBLIC_SITE_URL` | No | Public URL for the frontend, used for OpenGraph/Twitter metadata. | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase URL for real-time deployment updates. | – |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key for real-time subscriptions. | – |

## API Surface

All endpoints that return deployments or analyses support an optional `?network=mainnet|testnet` query parameter for filtering. Omit to get data from both networks.

- **Health & status**
  - `GET /health` – Aggregated service health (Supabase + Sui + timestamps).
  - `GET /api/status` – Lightweight status banner.
- **Supabase & database**
  - `GET /api/supabase/health` – Verifies Supabase client initialization.
- **Sui monitoring**
  - `GET /api/sui/recent-deployments` – Live deployments from RPC with cursor support.
  - `GET /api/sui/latest-deployment` – Single most recent deployment.
  - `GET /api/sui/deployments?network=` – Historical deployments persisted in Supabase.
  - `GET /api/sui/deployment-stats?network=` – Deployment statistics (total, last 24h, delta).
  - `GET /api/sui/health` – RPC connectivity diagnostics.
  - `GET /api/sui/monitor-status` – Background worker status for all networks.
  - `GET /api/sui/debug` – Inspect recent transactions and published packages (development aid).
- **LLM contract analysis**
  - `POST /api/llm/analyze` – Trigger analysis for a specific `package_id` / `network` (runs LLM if cache miss).
  - `GET /api/llm/analyze/:packageId?network=` – Fetch stored analysis for a package + network.
  - `GET /api/llm/recent-analyses?network=` – Paginated list of recent analyses.
  - `GET /api/llm/high-risk?network=` – High-risk analyses (critical/high).
  - `GET /api/llm/analyzed-contracts?network=` – Dashboard-friendly format (used by the frontend).
  - `GET /api/llm/health` – LLM configuration status + analysis count.

## Background Monitoring & Analysis

The system runs **two independent monitors** for mainnet and testnet:

1. `startMonitoring()` (bootstrapped in `src/index.ts`) starts both network monitors concurrently.
2. Each monitor loads its last processed checkpoint from Supabase (per-network tracking).
3. Monitors poll their respective Sui RPC endpoints with network-specific intervals (testnet: 15s, mainnet: 30s).
4. New deployments are tagged with their network and upserted into `sui_package_deployments` with composite primary key `(package_id, network)`.
5. For each new package, the monitor requests an LLM safety card via `runFullAnalysisChain`.
6. **Map-Reduce for Large Contracts**: Contracts with multiple modules are chunked and analyzed in parallel, then findings are aggregated.
7. Results are persisted in `contract_analyses` with composite primary key `(package_id, network)` and exposed through `/api/llm/*` endpoints.
8. High-risk packages are logged with elevated console output prefixed with network (e.g., `[mainnet] 🚨 HIGH RISK`).

Set `ENABLE_AUTO_ANALYSIS=false` to skip both workers, or `ENABLE_SUI_RPC=false` to short-circuit every Sui RPC call while working offline.

## Analysis Pipeline Architecture

RedFlag uses a multi-layered analysis approach combining deterministic static analysis with LLM-powered security auditing. The pipeline is designed to minimize hallucinations and provide confidence metrics.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTRACT ANALYSIS PIPELINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   Package    │
                              │     ID       │
                              └──────┬───────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: CACHE CHECK                                                        │
│  • Check Supabase for existing analysis                                     │
│  • If found & not forced → Return cached result                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: FETCH PACKAGE DATA                                                 │
│  • Get disassembled bytecode from Sui RPC                                   │
│  • Get normalized modules (function signatures, structs)                    │
│  • Extract dependencies from bytecode (0x...:: patterns)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: PRE-LLM ANALYSIS (Deterministic)                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 3.5 STATIC      │  │ 3.6 CROSS-      │  │ 3.7 DEPENDENCY  │             │
│  │ ANALYSIS        │  │ MODULE          │  │ ANALYSIS        │             │
│  │                 │  │                 │  │                 │             │
│  │ • Regex patterns│  │ • Track caps    │  │ • Check deps    │             │
│  │ • CRITICAL/HIGH │  │ • Detect flows  │  │ • Mark unaudited│             │
│  │ • MEDIUM/LOW    │  │ • Flag risks    │  │ • Inherit risk  │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┴────────────────────┘                       │
│                                │                                            │
│                    ┌───────────▼───────────┐                                │
│                    │   Aggregated Context  │                                │
│                    │   for LLM Analysis    │                                │
│                    └───────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: LANGCHAIN 3-AGENT ANALYSIS                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AGENT 1: ANALYZER                                                   │   │
│  │  • Reviews bytecode + static findings + cross-module risks           │   │
│  │  • Identifies technical vulnerabilities                              │   │
│  │  • Matches against risk pattern knowledge base                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  EVIDENCE VALIDATION (Post-Agent 1)                                  │   │
│  │  • Verify function exists in bytecode                                │   │
│  │  • Verify evidence snippet exists in bytecode                        │   │
│  │  • Score: 0-100 validation score per finding                         │   │
│  │  • REMOVE invalid/hallucinated findings                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AGENT 2: SCORER                                                     │   │
│  │  • Analyzes VALIDATED findings only                                  │   │
│  │  • Calculates base risk score (0-100)                                │   │
│  │  • Applies severity modifiers                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AGENT 3: REPORTER                                                   │   │
│  │  • Translates technical findings for users                           │   │
│  │  • Creates human-readable summary                                    │   │
│  │  • Generates impact assessment                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CONFIDENCE CALCULATION                                              │   │
│  │  • Validation rate, truncation, static/LLM agreement                 │   │
│  │  • Output: confidence_interval, confidence_level, analysis_quality   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: PERSISTENCE                                                        │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ contract_       │  │ dependency_     │  │ analysis_       │             │
│  │ analyses        │  │ risks           │  │ audit_logs      │             │
│  │                 │  │                 │  │                 │             │
│  │ • SafetyCard    │  │ • Dep status    │  │ • Duration      │             │
│  │ • Risk score    │  │ • Risk inherit  │  │ • Findings      │             │
│  │ • Findings      │  │ • Audit status  │  │ • Errors        │             │
│  │ • Confidence    │  │                 │  │ • Metrics       │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  SafetyCard  │
                              │   Response   │
                              └──────────────┘
```

### Analysis Layers

| Layer | File | Purpose |
|-------|------|---------|
| Static Analysis | `static-analyzer.ts` | Deterministic regex-based pattern detection (pre-LLM) |
| Cross-Module | `cross-module-analyzer.ts` | Tracks capability flows between modules |
| Dependency Analysis | `dependency-analyzer.ts` | Assesses risks from external dependencies |
| Evidence Validation | `evidence-validator.ts` | Validates LLM findings against actual bytecode |
| Confidence Scoring | `langchain-analyzer.ts` | Calculates confidence intervals and quality metrics |
| Audit Trail | `audit-trail.ts` | Logs analysis metadata for debugging |

### Static Patterns Detected

- `STATIC-ADMINCAP-TRANSFER` - AdminCap transferred in public functions (Critical)
- `STATIC-TREASURYCAP-PUBLIC` - TreasuryCap exposed publicly (Critical)
- `STATIC-UPGRADECAP-TRANSFER` - UpgradeCap transferred to arbitrary address (Critical)
- `STATIC-BALANCE-DRAIN` - Funds withdrawal patterns (High)
- `STATIC-COIN-SPLIT-TRANSFER` - Token splitting/transfer patterns (High)
- And more Sui-specific patterns...

### SafetyCard Output Structure

```typescript
{
  // User-facing summary
  summary: string,
  risky_functions: [...],
  rug_pull_indicators: [...],
  impact_on_user: string,
  why_risky_one_liner: string,

  // Risk assessment
  risk_score: number,        // 0-100
  risk_level: string,        // low | moderate | high | critical

  // Technical details
  technical_findings: [{
    function_name: string,
    matched_pattern_id: string,
    severity: string,
    evidence_code_snippet: string,
  }],

  // Validation metrics
  validation_summary: {
    total: number,
    validated: number,
    invalid: number,
  },

  // Confidence metrics
  confidence_interval: { lower: number, upper: number },
  confidence_level: string,  // high | medium | low
  analysis_quality: {
    modules_analyzed: number,
    truncation_occurred: boolean,
    validation_rate: number,
  },

  // Dependency summary
  dependency_summary: {
    total_dependencies: number,
    audited_count: number,
    unaudited_count: number,
  }
}
```

## Supabase Schema

Both core tables use composite primary keys `(package_id, network)` to support multi-network monitoring:

```sql
-- Core tables with multi-network support
create table if not exists public.sui_package_deployments (
  package_id text not null,
  network text not null default 'testnet',
  deployer_address text not null,
  tx_digest text not null,
  checkpoint bigint not null,
  timestamp timestamptz not null,
  first_seen_at timestamptz not null default now(),
  primary key (package_id, network)
);

create table if not exists public.contract_analyses (
  id uuid default gen_random_uuid(),
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
  validation_summary jsonb,
  confidence_interval jsonb,
  confidence_level text,
  analysis_quality jsonb,
  limitations jsonb,
  dependency_summary jsonb,
  analysis_status text default 'completed',
  error_message text,
  analyzed_at timestamptz not null default now(),
  primary key (package_id, network)
);

-- Dependency risk tracking
create table if not exists public.dependency_risks (
  id serial primary key,
  package_id text not null,
  network text not null default 'mainnet',
  dependency_type text default 'unknown',
  is_system_package boolean default false,
  is_audited boolean default false,
  is_upgradeable boolean default false,
  risk_score integer,
  risk_level text,
  last_analyzed timestamptz,
  analysis_source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (package_id, network)
);

-- Analysis audit logs (for debugging & monitoring)
create table if not exists public.analysis_audit_logs (
  id serial primary key,
  package_id text not null,
  network text not null default 'testnet',
  analyzed_at timestamptz default now(),
  total_duration_ms integer,
  total_tokens integer default 0,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  llm_calls integer default 0,
  modules_analyzed integer default 0,
  modules_total integer default 0,
  functions_analyzed integer default 0,
  functions_total integer default 0,
  truncation_occurred boolean default false,
  static_findings_count integer default 0,
  llm_findings_count integer default 0,
  validated_findings_count integer default 0,
  cross_module_risks_count integer default 0,
  final_risk_score integer,
  final_risk_level text,
  errors jsonb default '[]'::jsonb,
  warnings jsonb default '[]'::jsonb,
  model_used text,
  analysis_version text default 'v1',
  created_at timestamptz default now()
);

-- Indexes for performance (network filtering is common)
create index if not exists idx_deployments_network_checkpoint on sui_package_deployments(network, checkpoint desc);
create index if not exists idx_contract_analyses_network on contract_analyses(network);
create index if not exists idx_contract_analyses_risk_level on contract_analyses(risk_level);
create index if not exists idx_contract_analyses_status on contract_analyses(analysis_status);
create index if not exists idx_dependency_risks_package_network on dependency_risks(package_id, network);
create index if not exists idx_audit_logs_analyzed_at on analysis_audit_logs(analyzed_at desc);
```

Run migrations in order from `backend/migrations/` or apply the schema above directly. Adjust column types as needed for your Supabase project.

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

- **Frontend (Vercel)**: Set `NEXT_PUBLIC_BACKEND_URL` to your deployed backend. Root directory should point to `frontend` with the default Next.js build.
- **Backend (Railway or similar)**: Deploy from `backend`, supply all environment variables (especially `FRONTEND_URL` for CORS and the multi-network RPC URLs). Both monitors start automatically on boot.
- Coordinate updates so Vercel and Railway share the same allowed origins and Supabase credentials.

## Troubleshooting

- **CORS errors**: ensure `FRONTEND_URL` matches the requesting origin exactly (protocol + host + port).
- **LLM analysis skipped**: check that `OPEN_ROUTER_KEY` is set; the worker logs `⚠️  OPEN_ROUTER_KEY not configured` otherwise.
- **No deployments stored**: verify Supabase tables exist and the service role key has `insert`/`upsert` permissions.
- **Monitor idle**: inspect `/api/sui/monitor-status` and server logs; adjust `POLL_INTERVAL_MS` if rate-limited.
- **Frontend 500s**: confirm `NEXT_PUBLIC_BACKEND_URL` is reachable and HTTPS when deployed to Vercel.
- **Large contract analysis**: Contracts with multiple modules are automatically chunked and analyzed in parallel. Check logs for `[MapReduce]` messages to monitor progress.

## Future Improvements (Roadmap)

The following improvements are planned to enhance reliability, observability, and cost control of the LLM analysis pipeline.

### Phase 1: Critical Fixes (Prevent Failures)

- [ ] **Concurrency Control** - Add semaphore to limit parallel LLM calls (max 3-5) to prevent rate limit cascades
- [ ] **Input Size Limits** - Add truncation for all input fields (functions, structs), not just bytecode
- [ ] **Global Fallback State** - Track model state globally to prevent per-module fallback cascades
- [ ] **Retry Loop Prevention** - Add `retry_count` column, skip contracts after N persistent failures

### Phase 2: Quality Improvements

- [ ] **Finding Deduplication** - Dedupe findings by `function_name + pattern_id` after Map-Reduce aggregation
- [ ] **Partial Failure Handling** - Add `analysis_quality` field showing % of modules that succeeded
- [ ] **Flexible JSON Recovery** - Make field-order-agnostic regex extraction for truncated responses
- [ ] **Model Tracking** - Add `model_used` column to track which model produced successful analyses

### Phase 3: Observability & Control

- [ ] **Cost Tracking** - Track tokens per request, log totals, estimate costs
- [ ] **Circuit Breaker** - Stop using paid model after X uses per hour to control costs
- [ ] **Error Classification** - Create error taxonomy to distinguish transient vs permanent failures
- [ ] **Score Consistency** - Cache analysis results, only re-analyze on explicit request

### Phase 4: Advanced Features

- [ ] **Giant Module Splitting** - Split oversized single modules by function groups
- [ ] **Timeout Control** - Add explicit timeout wrapper for full analysis chain
- [ ] **Semantic Validation** - Add deeper validation of findings beyond function existence
- [ ] **Analysis Resumption** - Resume partially completed analyses instead of restarting

See `.local-implementation-plan.md` (not tracked in git) for detailed implementation specifications.

## Contributing

This is a private project. Follow the workspace coding standards, prefer small focused commits, and update this README when workflows change.

## License

Private – all rights reserved.
