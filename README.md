# AI Interview

Text-based AI interview MVP built with Next.js, Hono, and shared TypeScript schemas.

## Structure

- `apps/web` - Next.js frontend
- `apps/api` - Hono backend
- `packages/shared` - shared Zod schemas and TypeScript types

## Commands

```bash
pnpm install
pnpm dev
pnpm --filter api test:gemini
```

## Deployment

### Vercel (`apps/web`)

Use `apps/web` as the Vercel project root. The included `vercel.json` builds the Next.js app with `pnpm build` and serves the output from `.next`.

Required Vercel environment variables:

- `NEXT_PUBLIC_API_URL` - deployed API URL, for example `https://api.example.workers.dev`

### Cloudflare Workers (`apps/api`)

The API is configured through `apps/api/wrangler.jsonc` and deploys with:

```bash
pnpm --filter api deploy
```

Set production secrets with `wrangler secret put` from `apps/api` before deploying.

Required Cloudflare secrets:

- `DATABASE_URL` - Neon pooled PostgreSQL connection string with SSL enabled
- `JWT_SECRET` - long random value used to sign auth tokens
- `AI_API_KEY` - Gemini API key for production question generation and evaluation
- `CORS_ORIGIN` - comma-separated allowed frontend origins, for example `https://ai-interview.example.com`

Production `AI_PROVIDER=gemini` and `AI_MODEL=gemini-2.5-flash` are set in `wrangler.jsonc`.
Local development should include local frontend origins in `CORS_ORIGIN`, for example `http://localhost:3000,http://127.0.0.1:3000`.
Set `AI_FALLBACK_TO_MOCK=true` only in local or non-production environments where mock AI output is acceptable.

### Neon

Create a Neon project and use the pooled connection string for both local migrations and the deployed API.

Local API development uses `apps/api/.dev.vars`:

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

Production API setup:

```bash
cd apps/api
pnpm db:migrate
pnpm wrangler secret put DATABASE_URL
```

## MVP Completion Checklist

Core product capabilities:

- [x] User authentication with register, login, persisted sessions, and current-user loading.
- [x] Protected interview data with JWT authorization and user-owned interview records.
- [x] AI-generated interview questions through mock and Gemini providers.
- [x] AI answer evaluation with scoring, feedback, strengths, improvements, and follow-up prompts.
- [x] End-to-end interview flow from setup to answer submission to final report.
- [x] Interview history dashboard with status, score, and quick resume/report actions.
- [x] Code editor for technical-style interviews, saved with answers and shown in reports.
- [x] Gemini prompt hardening for untrusted user-provided interview, answer, and code content.

Before calling the MVP done:

- [ ] Run and confirm `pnpm -r typecheck`.
- [ ] Run and confirm `pnpm --filter web build`.
- [ ] Manually smoke test register, create interview, answer all questions, generate report, return to dashboard, log out, log back in, resume, and view report.
- [ ] Confirm deployed web/API environments are configured.
- [ ] Document known limitations.

## Post-MVP Roadmap

These are larger follow-up areas that show deeper engineering range. They are intentionally limited to substantial systems work, not small product conveniences.

- [ ] Senior-engineering evaluation depth for code and answers, including tradeoffs, edge cases, debugging approach, and systems thinking.
- [ ] Production operations hardening with smoke checks, structured logging, failure monitoring, and deployment rollback notes.
- [ ] Collaborative code editor with room presence, WebSocket sync, conflict handling, and reconnect recovery.
- [ ] WebRTC video interview room with camera/microphone controls, signaling, connection state, and reconnect handling.
- [ ] Sandboxed code execution with language-specific runners, timeouts, resource limits, and safe result reporting.

## Engineering TODO

- [x] Core interview flow: create interviews, answer questions, evaluate results, and view reports.
- [x] Authentication and authorization: issue JWTs, attach users to interviews, and protect interview data.
- [x] Shared validation and API errors: use shared schemas, clean validation responses, and user-facing frontend messages.
- [x] AI provider integration: support mock and Gemini providers with production-ready prompts and scoring.
- [x] Deployment setup: configure Vercel, Cloudflare Workers, Neon, production AI settings, and CORS origins.
- [x] Frontend workflow polish: loading states, progress, report navigation, restart/back actions, and clearer save behavior.
- [x] Finish UI state consistency across all user-facing screens: loading, error, empty, and loaded states.
- [x] Expand code quality cleanup from `AGENTS.md`: route/service boundaries, shared schemas, named functions, and env access patterns.
- [ ] Add broader automated coverage for auth, interview ownership, answer submission, report generation, and frontend flows.
- [ ] Harden production operations: secret rotation notes, deployment smoke checks, logging review, and failure monitoring.
- [ ] Improve interview UX: question navigation, draft recovery, report readability, and clearer next actions.
- [ ] Prepare production launch checklist: seeded manual test plan, deployment verification, rollback notes, and known limitations.
