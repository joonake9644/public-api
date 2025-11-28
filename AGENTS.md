# Repository Guidelines

## Project Structure & Module Organization
This Next.js 16 App Router repo keeps pages, layouts, and API handlers inside `app/` (styles in `app/globals.css`, routes in `app/api/<feature>` such as `app/api/health`). Domain logic lives in `src/lib` with folders like `coordinate/`, `rateLimit/`, `cache/`, `api/`, `auth/`, shared `types/`, `utils/`, plus `firebase.ts` for Firebase bootstrap code. Static assets stay in `public/`, while specs live in `doc/`, `STATE.md`, and `CLAUDE.md`; consult the two state files first.

## Build, Test, and Development Commands
- `npm run dev` - launch dev server at `http://localhost:3000`.
- `npm run build` / `npm run start` - build and run the production bundle.
- `npm run lint` - run the Next.js + TypeScript ESLint rules defined in `eslint.config.mjs`.
- `npm run typecheck` - execute `tsc --noEmit` with the strict compiler profile.
- `npm run test`, `npm run test:watch`, `npm run test:ui`, `npm run test:coverage` - run Vitest suites, watch mode, the UI explorer, or coverage reports.

## Coding Style & Naming Conventions
Stick to TypeScript (only legacy code should be JS). Keep modules domain scoped and named after their main export; React components stay PascalCase, hooks start with `use`, and helper modules use camelCase. Follow the uppercase environment-variable pattern from `.env.example`, keep secrets in `.env.local`, rely on the `@/*` alias, and run `npm run lint -- --fix` before committing.

## Testing Guidelines
Vitest runs in a Node environment with globals, and `vitest.setup.ts` preloads deterministic API keys. Co-locate tests as `*.test.ts(x)` or inside `__tests__/` folders (for example `src/lib/rateLimit/__tests__/TokenBucket.test.ts`). Coverage thresholds (lines/statements 90%, branches 85%) demand deterministic fixtures and error-path checks; run `npm run test:coverage` before each pull request and share results if regressions appear.

## Commit & Pull Request Guidelines
Use Conventional Commits such as `feat(rate-limit): add sliding window`, and describe scope, impacted modules, and any config or environment changes in the body. Each pull request must cite the relevant `STATE.md` milestone, list manual and automated tests, attach screenshots or API samples for behavior changes, and merge only after lint/tests pass with docs updated.

## Workflow & Quality Gates
1. Read `STATE.md` and `CLAUDE.md` before every task so Codex stays aligned with the recorded phase and pending work.
2. Share a brief plan (scope, touched modules, tests) and wait for acknowledgement before coding.
3. Reuse existing helpers, remove duplicates, and run lint/tests whenever high-risk code changes.
4. After tests pass, report outcomes, note risks, and update STATE/CLAUDE before moving on.
