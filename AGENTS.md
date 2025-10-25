# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by Yarn workspaces. UI lives in `frontend/` (Next.js App Router); API lives in `backend/` (Express + TypeScript).
- Page entry points stay in `frontend/app/`, shared UI under `frontend/app/components/`, and static assets in `frontend/public/`. Tailwind globals live in `frontend/app/globals.css`.
- Backend source is in `backend/src/`. Build artifacts emit to `backend/dist/`; keep only TypeScript in git. Deployment configs sit in `vercel.json` and `backend/railway.json`.

## Build, Test, and Development Commands
- `yarn install` hydrates all workspaces.
- `yarn dev` launches Next.js on `http://localhost:3000` and the Express server on `http://localhost:3001` via `tsx`.
- `yarn dev:frontend` / `yarn dev:backend` target a single service for faster feedback.
- `yarn build` runs both production builds; use `yarn build:frontend` or `yarn build:backend` when you only touch one side.
- `yarn workspace frontend lint` (add `--fix` when safe) enforces ESLint + Next rules before committing.

## Coding Style & Naming Conventions
Stick with TypeScript, 2-space indentation, and ES module imports. React components use PascalCase (`HealthCheck.tsx`), hooks and utilities stay colocated with the feature under `frontend/app/`, and Tailwind utilities remain the default styling approach. Backend route handlers mirror the pattern in `backend/src/index.ts`, using camelCase identifiers, explicit interfaces, and the shared `allowedOrigins` list—extend that array rather than re-hardcoding URLs.

## Testing Guidelines
Automated suites are not set up yet. When you add coverage, prefer Jest + Testing Library in `frontend/__tests__/` for UI and Supertest for API routes. Until tooling lands, run `yarn dev`, verify `/health` and `/api/status` return 200, and record manual checks in the PR. Aim for assertions that exercise success and failure paths, not just snapshots.

## Commit & Pull Request Guidelines
Follow the Conventional Commit format already in history (`feat:`, `fix:`, etc.) with imperative, lower-case subjects. PRs should include a concise summary, linked issue (if any), screenshots or cURL output for visible or API changes, and the commands you ran. Confirm lint/build status locally before requesting review and ping maintainers who own the affected area.

## Environment & Deployment Notes
Local work expects `frontend/.env.local` and `backend/.env`; propagate new keys by updating the matching `.env.example` files. Production secrets stay in Vercel and Railway dashboards. Whenever URLs change, update the relevant env vars and extend the backend `allowedOrigins` list instead of embedding constants in React components.
