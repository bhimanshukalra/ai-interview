# Agent Instructions

These instructions are for Codex and other coding agents working in this repository.

## Project Context

- This is a TypeScript monorepo for a text-based AI interview MVP.
- `apps/web` contains the Next.js frontend.
- `apps/api` contains the Hono API.
- `packages/shared` contains shared Zod schemas and TypeScript types.
- Prefer existing project patterns over introducing new abstractions.

## Code Quality

- Avoid anonymous functions for exported handlers, hooks, components, and non-trivial callbacks.
- Prefer named functions when the function may appear in stack traces, tests, logs, or React DevTools.
- Keep functions small, focused, and easy to name.
- Prefer explicit return types on exported functions.
- Avoid `any` unless it is at a real integration boundary and there is no better local type.
- Do not suppress TypeScript, lint, or build errors without a short explanation.
- Avoid deeply nested conditionals; use early returns when they make the code easier to read.
- Keep unrelated refactors out of focused changes.

## React and Next.js

- Use client components only when interactivity or browser APIs require them.
- Keep API calls in feature-level API modules or hooks.
- Avoid reading required runtime environment variables at module import time if doing so can break build, prerender, or tests.
- Keep UI components focused on rendering and user interaction; move reusable business logic into hooks or helpers.
- Follow the existing styling approach before adding new UI conventions.

## API and Shared Code

- Reuse shared Zod schemas and inferred types from `packages/shared` for request and response contracts.
- Validate external input at API boundaries.
- Return clear API errors that the frontend can display without leaking internals.

## Verification

- Run the most relevant check before finishing a code change.
- Prefer targeted checks for small changes and broader checks for shared or cross-app changes.
- Useful commands:
  - `pnpm --filter web build`
  - `pnpm --filter web typecheck`
  - `pnpm --filter api typecheck`
  - `pnpm -r typecheck`
