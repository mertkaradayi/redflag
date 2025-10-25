# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js 16 App Router app with React 19. Place UI in `app/components`, shared providers in `app/providers.tsx`, and use the `@/` alias for cross-module imports.
- `backend/`: Express + Supabase service in `src`. Keep integrations under `src/lib` (e.g., `supabase.ts`) and expose new routes through `src/index.ts`. Compiled output lands in `dist/`.
- Root workspace scripts live in `package.json`. Add dependencies via `yarn workspace <name> add <pkg>` so each service stays isolated.

## Build, Test, and Development Commands
- `yarn dev`: Runs frontend (port 3000) and backend (port 3001) concurrently via `concurrently`.
- `yarn dev:frontend`, `yarn dev:backend`: Focus on a single service.
- `yarn build` or per-service builds (`yarn build:frontend`, `yarn build:backend`): Produce production artifacts.
- `yarn workspace frontend lint`: Apply ESLint (Next.js core-web-vitals). Treat warnings as actionable.

## Coding Style & Naming Conventions
- TypeScript is strict across the repo; prefer typed function components and explicit return types for shared utilities.
- Component files use `PascalCase.tsx`; backend modules use `kebab-case.ts`. Keep Tailwind class strings readable (group layout → color → typography).
- Centralize environment access: `process.env` on the backend, `NEXT_PUBLIC_*` on the frontend. Document any new keys.

## Testing Guidelines
- No automated suite is checked in yet. When adding logic, include tests with the same PR.
- Frontend: add component/integration specs under `frontend/__tests__` using `@testing-library/react` with `vitest` (include setup in the PR). Mock Privy and Supabase clients locally.
- Backend: exercise Express routes with `supertest` against the exported app in `src/index.ts`. Cover new endpoints and update `/health`/`/api/status` smoke paths when touched.
- Record manual verification steps if a feature cannot be automated. Aim for meaningful coverage of changed code.

## Commit & Pull Request Guidelines
- Follow existing conventional-commit patterns (`feat:`, `fix:`, `chore:`) in present tense; squash WIP commits before opening a PR.
- PR description should include: concise summary, testing evidence (commands output, screenshots of health checks/UI), environment variable changes, and linked issue or task.
- Call out deployment impacts (Vercel or Railway) whenever CORS, URLs, or secrets shift to keep `allowedOrigins` and Supabase credentials aligned.

## Environment & Security Notes
- Store secrets in `backend/.env` and `frontend/.env.local`; never commit live keys. Provide placeholder values in PR notes when introducing new variables.
- Review CORS updates in `backend/src/index.ts` and Privy configuration in `app/providers.tsx` to avoid production lockouts. Rotate keys immediately if they appear in logs or commits.
