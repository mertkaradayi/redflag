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
2. `workers/sui-monitor.ts` - Background polling worker (configurable via `POLL_INTERVAL_MS`)
3. `lib/sui-client.ts` - Sui RPC wrapper for deployment queries
4. `lib/supabase.ts` - Database operations for deployments and analyses
5. `lib/llm-analyzer.ts` - Orchestrates 3-agent chain with Map-Reduce for large contracts
6. `lib/langchain-analyzer.ts` - LangChain implementation with parallel module analysis
7. `lib/langchain-llm.ts` - OpenRouter LLM configuration and model presets
8. `lib/risk-patterns.ts` - Security pattern knowledge base for Move contracts

### LLM Analysis Chain

The analyzer uses a 3-agent architecture via OpenRouter (default: `openai/gpt-oss-120b` via DeepInfra):
- **Agent 1 (Analyzer)**: Technical security audit matching against risk patterns
- **Agent 2 (Scorer)**: Quantitative risk score (0-100) with severity modifiers
- **Agent 3 (Reporter)**: User-friendly translation of findings

**Map-Reduce for Large Contracts**: Contracts with multiple modules are automatically chunked and analyzed in parallel using `Promise.allSettled`. Findings are aggregated, sorted by severity, and passed to the scorer/reporter.

Results are persisted to `contract_analyses` table and cached.

### Frontend Structure (`frontend/app/`)

- Uses `@/` path alias rooted at `frontend/`
- `providers.tsx` - Global providers (Privy auth, theme, data context)
- `dashboard/` - Main dashboard route with types and risk utilities
- `components/` - UI components (PascalCase filenames)

### Database Tables (Supabase)

- `sui_package_deployments` - Raw deployment metadata from Sui
- `contract_analyses` - LLM-generated safety cards with risk scores

## Key Patterns

### Environment Flags

Backend uses `envFlag()` helper for boolean env vars:
- `ENABLE_AUTO_ANALYSIS` - Toggle background monitor + auto analysis
- `ENABLE_SUI_RPC` - Master kill switch for all Sui RPC calls

### Network Detection

Network is determined from `SUI_NETWORK` env var or inferred from `SUI_RPC_URL`.

### LLM Configuration

- `OPEN_ROUTER_KEY` - Required for LLM analysis
- `LLM_MODEL_ANALYZER`, `LLM_MODEL_SCORER`, `LLM_MODEL_REPORTER` - Optional model overrides
- Default model: `openai/gpt-oss-120b` via DeepInfra with FP4 quantization

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
