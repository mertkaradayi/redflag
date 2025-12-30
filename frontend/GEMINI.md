# RedFlag Frontend

RedFlag Frontend is a Next.js 16 application designed to surface risk intelligence for Sui smart contracts. It visualizes data analyzed by a multi-agent LLM pipeline, providing dashboards, deployment histories, and detailed analysis reports.

## Project Overview

*   **Type:** Web Application (Frontend)
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4, shadcn/ui
*   **State Management:** React Hooks (local state), no global store.
*   **Backend:** Consumes an external Express API and Supabase.

## Getting Started

### Prerequisites

*   Node.js 20+
*   Yarn Classic (v1)

### Environment Setup

1.  Copy `.env.example` to `.env.local`:
    ```bash
    cp .env.example .env.local
    ```
2.  Configure the following variables:
    *   `NEXT_PUBLIC_BACKEND_URL`: URL of the backend API (e.g., `http://localhost:3001`).
    *   `NEXT_PUBLIC_SITE_URL`: Public URL for OpenGraph metadata.
    *   `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key.

### Key Commands

*   **Development:**
    ```bash
    yarn dev
    ```
    Starts the development server on `http://localhost:3000`.

*   **Build:**
    ```bash
    yarn build
    ```
    Builds the application for production.

*   **Start:**
    ```bash
    yarn start
    ```
    Runs the built production application.

*   **Lint:**
    ```bash
    yarn lint
    ```
    Runs ESLint to check for code quality and style issues.

## Architecture

### Directory Structure

*   `app/`: Next.js App Router pages and layouts.
    *   `dashboard/`: Main dashboard view.
    *   `analyze/`: Single contract analysis view.
    *   `deployments/`: Deployment history view.
    *   `components/`: Route-specific components.
*   `components/`: Shared UI components.
    *   `ui/`: Reusable primitives (shadcn/ui).
*   `lib/`: Utility functions and API clients.
    *   `deployments.ts`: Centralized API client for fetching deployment data.
    *   `supabase.ts`: Supabase client initialization.
    *   `utils.ts`: General utilities (including `cn` for class merging).
*   `public/`: Static assets.

### Data Flow

1.  **Fetching:** Data is fetched from the backend API using functions in `lib/deployments.ts`.
2.  **Filtering:** Network filtering (Mainnet/Testnet) is handled server-side via query parameters passed to the API.
3.  **Real-time:** Supabase is utilized for real-time updates on deployments.

### Styling

*   **Tailwind CSS v4:** Configured via `app/globals.css` using the `@import "tailwindcss";` directive.
*   **Theming:** CSS variables are used for theming (light/dark mode), compatible with `shadcn/ui`.
*   **Icons:** `lucide-react` is used for icons.

## Development Conventions

*   **Component Naming:** PascalCase for component files (e.g., `AnalyzedContractCard.tsx`).
*   **Class Merging:** Use the `cn()` utility from `@/lib/utils` for conditional class names.
*   **Risk Logic:** Centralize risk-related logic and styling helpers in `app/dashboard/risk-utils.ts`.
*   **Imports:** Use `@/` alias to refer to the project root.
*   **Type Safety:** Strict TypeScript usage. Define interfaces for API responses and data models (e.g., in `app/dashboard/types.ts` or `lib/deployments.ts`).
