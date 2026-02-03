# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RedFlag is a monorepo that monitors Sui blockchain smart-contract deployments, runs AI-powered risk analysis via OpenRouter, and displays results in a React dashboard. It identifies potential rug pulls and risky contract patterns.

## Commands

```bash
# Development
yarn install           # Install all dependencies (both workspaces)
yarn dev               # Run frontend (3000) + backend (3001) concurrently
yarn dev:frontend      # Frontend only
yarn dev:backend       # Backend only (uses tsx watch for hot reload)

# Production builds
yarn build             # Build both workspaces
yarn build:frontend    # Next.js production build
yarn build:backend     # TypeScript compile to dist/

# Testing & Linting
yarn workspace frontend lint              # ESLint with core-web-vitals
yarn workspace backend test               # Run backend tests (tsx --test)
```

## Architecture

### Monorepo Structure (Yarn Workspaces)

- **frontend/**: Next.js 16 + React 19 dashboard with Tailwind CSS v4
- **backend/**: Express API with Sui RPC integration, Supabase persistence, and OpenRouter LLM analysis

### Backend Flow (`backend/src/`)

1. `index.ts` - Express server with CORS, routes, and graceful shutdown

**Workers** (`workers/`):
- `sui-monitor.ts` - Live checkpoint-based monitor for real-time deployment detection (mainnet + testnet)
- `historical-monitor.ts` - Background backfill worker for catching up old deployments
- `analysis-worker.ts` - Decoupled LLM analysis processor with concurrency control

**Libraries** (`lib/`):
- `network-config.ts` - Multi-network configuration management
- `sui-client.ts` - Sui RPC wrapper with checkpoint-based deployment queries
- `supabase.ts` - Database operations with network-aware queries
- `llm-analyzer.ts` - Orchestrates 3-agent chain with Map-Reduce for large contracts
- `langchain-analyzer.ts` - LangChain implementation with parallel module analysis
- `langchain-llm.ts` - OpenRouter LLM configuration and model presets
- `risk-patterns.ts` - Security pattern knowledge base for Move contracts
- `static-analyzer.ts` - Deterministic regex-based pattern detection (pre-LLM)
- `cross-module-analyzer.ts` - Tracks capability flows between modules
- `dependency-analyzer.ts` - Assesses risks from external dependencies
- `evidence-validator.ts` - Validates LLM findings against actual bytecode
- `confidence-calculator.ts` - Calculates confidence intervals and quality metrics

### LLM Analysis Chain

The analyzer uses a 3-agent architecture via OpenRouter (default: `openai/gpt-oss-120b` via DeepInfra):
- **Agent 1 (Analyzer)**: Technical security audit matching against risk patterns
- **Agent 2 (Scorer)**: Quantitative risk score (0-100) with severity modifiers
- **Agent 3 (Reporter)**: User-friendly translation of findings

**Map-Reduce for Large Contracts**: Contracts with multiple modules are automatically chunked and analyzed in parallel using `Promise.allSettled`. Findings are aggregated, sorted by severity, and passed to the scorer/reporter.

Results are persisted to `contract_analyses` table and cached.

### Frontend Structure (`frontend/app/`)

- Uses `@/` path alias rooted at `frontend/`
- `providers.tsx` - Global providers (theme, toast)
- `dashboard/` - Main dashboard route with types and risk utilities
- `components/` - UI components (PascalCase filenames)

### Database Tables (Supabase)

- `sui_package_deployments` - Raw deployment metadata from Sui with composite primary key (package_id, network)
- `contract_analyses` - LLM-generated safety cards with risk scores and composite primary key (package_id, network)
- Both tables support multi-network: same package can exist on mainnet and testnet independently

## Key Patterns

### Environment Flags

Backend uses `envFlag()` helper for boolean env vars:
- `ENABLE_AUTO_ANALYSIS` - Toggle all background workers (monitors + analysis)
- `ENABLE_SUI_RPC` - Master kill switch for all Sui RPC calls
- `ENABLE_HISTORICAL_BACKFILL` - Toggle historical backfill monitor (default: true)

Historical monitor configuration:
- `HISTORICAL_POLL_INTERVAL_MS` - Backfill polling interval (default: 60000ms)
- `HISTORICAL_SAFETY_GAP` - Pause when this close to live monitor (default: 1000 checkpoints)
- `HISTORICAL_BOOTSTRAP_OFFSET` - How far back to start backfill (default: 604800 = ~7 days)

### Worker Architecture

The backend uses a 3-worker architecture for reliable monitoring and analysis:

**1. Live Monitor** (`sui-monitor.ts`):
- Checkpoint-based monitoring (not time-based polling)
- Processes checkpoints sequentially from Sui RPC
- Detects new deployments in real-time
- Runs independently for mainnet and testnet
- Stores deployments to DB; analysis worker handles LLM processing

**2. Historical Monitor** (`historical-monitor.ts`):
- Background backfill for data completeness
- Starts from configured offset (default: ~7 days back)
- Slower polling (60s) to not interfere with live monitor
- Pauses when caught up to live monitor (within safety gap)
- UPSERT ensures no duplicates with live monitor

**3. Analysis Worker** (`analysis-worker.ts`):
- Decoupled from monitors for reliability
- Polls DB for unanalyzed deployments
- Concurrency control (max 3 parallel analyses)
- Graceful error handling without blocking queue

### Multi-Network Support

The system monitors and analyzes both **mainnet** and **testnet** simultaneously:

**Backend**:
- Two independent live monitors run concurrently (one per network)
- Two independent historical monitors for backfill (one per network)
- One shared analysis worker processes both networks
- Network-specific RPC URLs: `SUI_RPC_URL_MAINNET`, `SUI_RPC_URL_TESTNET`
- Network-specific polling intervals: `POLL_INTERVAL_MS_MAINNET` (default 30s), `POLL_INTERVAL_MS_TESTNET` (default 15s)
- All API endpoints accept optional `?network=mainnet|testnet` query parameter (omit for all networks)
- Database queries filter by network at server-side for efficiency

**Frontend**:
- Dashboard includes All/Mainnet/Testnet filter toggle
- Network selection triggers server-side filtered queries
- Each contract card displays network badge

### LLM Configuration

- `OPEN_ROUTER_KEY` - Required for LLM analysis
- `LLM_MODEL_ANALYZER`, `LLM_MODEL_SCORER`, `LLM_MODEL_REPORTER` - Optional model overrides
- **Model**: `openrouter/free` — OpenRouter's smart router that auto-selects from available free models. Retries naturally hit different models for built-in fallback behavior.

### Map-Reduce Analysis

Large contracts (multiple modules) trigger automatic parallel analysis:
1. Contract chunked by module boundaries
2. Each module analyzed independently in parallel
3. Findings aggregated and sorted by severity (Critical → Low)
4. Single scorer and reporter run on combined findings

## Conventions

- **Backend modules**: kebab-case (`sui-client.ts`, `llm-analyzer.ts`)
- **Frontend components**: PascalCase (`AnalyzedContractCard.tsx`)
- **TypeScript**: Strict mode enabled in both workspaces
- **Styling**: Tailwind utility grouping (layout → color → typography)

## Future Work

### Freemium Access Control (Mainnet Data)

Current RLS policies allow public read access to all data from both networks. Consider implementing tiered access:

**Goal**: Testnet data = free (anon), Mainnet data = premium (authenticated only)

**Required changes**:
1. ✅ DONE: Both `sui_package_deployments` and `contract_analyses` have `network` column with composite primary keys
2. TODO: Update RLS policies:
   - `anon` role: `USING (network = 'testnet')`
   - `authenticated` role: `USING (true)`
3. TODO: Add authentication layer for premium access (options: Supabase Auth, custom JWT)

**Current state** (as of Dec 2024):
- Both tables support multi-network with composite primary keys (package_id, network)
- Dual monitors running for mainnet and testnet
- Frontend dashboard includes network filter (All/Mainnet/Testnet)
- RLS policies still allow public SELECT on both tables for both networks
