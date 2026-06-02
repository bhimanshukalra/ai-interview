# AI Interview

AI Interview is a full-stack interview practice platform where candidates can answer AI-generated questions, collaborate in a realtime code editor, join a two-person video interview room, and review structured AI feedback in a final report.

Built with Next.js, Hono, Socket.IO/Yjs, WebRTC, Gemini, PostgreSQL, and shared TypeScript/Zod contracts.

## Structure

- `apps/web` - Next.js frontend
- `apps/api` - Hono backend
- `apps/realtime` - Socket.IO/Yjs collaborative code-room and WebRTC signaling service
- `packages/shared` - shared Zod schemas and TypeScript types

## Commands

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm dev:realtime
pnpm verify:release
pnpm --filter api test:gemini
pnpm --filter realtime test
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

### Realtime service (`apps/realtime`)

The realtime service runs separately from the Cloudflare Worker API and handles collaborative code-room sync, presence, and WebRTC signaling.

Required realtime environment variables:

- `DATABASE_URL` - same database used by the API
- `JWT_SECRET` - same JWT secret used by the API
- `CORS_ORIGIN` - comma-separated allowed frontend origins
- `PORT` - optional, defaults to `8788`

Local development:

```bash
pnpm dev:realtime
```

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
- [x] Collaborative code editor for technical-style interviews, saved with answers and shown in reports.
- [x] WebRTC video interview room with camera/microphone controls, signaling, connection state, reconnect handling, and two-user smoke-test coverage.
- [x] Gemini prompt hardening for untrusted user-provided interview, answer, and code content.

Before calling the MVP done:

- [ ] Run and confirm `pnpm -r typecheck`.
- [ ] Run and confirm `pnpm --filter web build`.
- [ ] Manually smoke test register, create interview, answer all questions, generate report, return to dashboard, log out, log back in, resume, and view report.
- [ ] Manually smoke test collaborative code editing across two authorized sessions.
- [ ] Confirm deployed web/API environments are configured.
- [ ] Confirm deployed realtime environment is configured.
- [ ] Document known limitations.

## Project Showcase TODO

- [x] Add a concise product pitch at the top of the README.
- [ ] Add an architecture diagram covering web, API, realtime, shared contracts, database, Gemini, collaborative editor, and WebRTC signaling.
- [ ] Add an engineering highlights section for auth, shared schemas, AI prompt hardening, collaborative editing, WebRTC, and focused tests.
- [ ] Add a tradeoffs and limitations section that frames deferred work intentionally.
- [ ] Add a demo video or GIF to the README.
- [ ] Add screenshots for dashboard, interview setup, interview session, report, collaborative editor, and video room.
- [ ] Add a live demo link if hosting is practical.
- [ ] Add final verification notes with typecheck, build, realtime tests, and manual smoke tests.

## Post-MVP Roadmap

These are larger follow-up areas that show deeper engineering range. They are intentionally limited to substantial systems work, not small product conveniences.

- [x] Senior-engineering evaluation depth for code and answers, including tradeoffs, edge cases, debugging approach, and systems thinking.
- [x] Production operations hardening with smoke checks, structured logging, failure monitoring, and deployment rollback notes.
- [x] Collaborative code editor with room presence, WebSocket sync, conflict handling, reconnect recovery, and multi-user access roles.
- [x] WebRTC video interview room with camera/microphone controls, signaling, connection state, and reconnect handling.
- [ ] Sandboxed code execution with language-specific runners, timeouts, resource limits, and safe result reporting.
- [ ] Automated confidence suite for API ownership rules, realtime room authorization, collaborative editor flows, and report generation.

WebRTC is implemented for a two-person interview call. Multi-participant video, screen sharing, recording, device selection, and production TURN configuration remain future enhancements.

## Engineering TODO

- [x] Core interview flow: create interviews, answer questions, evaluate results, and view reports.
- [x] Authentication and authorization: issue JWTs, attach users to interviews, and protect interview data.
- [x] Shared validation and API errors: use shared schemas, clean validation responses, and user-facing frontend messages.
- [x] AI provider integration: support mock and Gemini providers with production-ready prompts and scoring.
- [x] Deployment setup: configure Vercel, Cloudflare Workers, Neon, production AI settings, and CORS origins.
- [x] Frontend workflow polish: loading states, progress, report navigation, restart/back actions, and clearer save behavior.
- [x] Finish UI state consistency across all user-facing screens: loading, error, empty, and loaded states.
- [x] Expand code quality cleanup from `AGENTS.md`: route/service boundaries, shared schemas, named functions, and env access patterns.
- [ ] Add automated coverage for auth ownership.
- [ ] Add automated coverage for interview creation.
- [ ] Add automated coverage for answer submission.
- [ ] Add automated coverage for report generation.
- [ ] Add automated coverage for realtime room authorization.
- [x] Harden production operations: secret rotation notes, deployment smoke checks, logging review, and failure monitoring.
- [ ] Improve interview UX: question navigation, report readability, and clearer next actions.
- [ ] Prepare production launch checklist: seeded manual test plan, realtime deployment verification, rollback notes, and known limitations.

## Known Limitations

- WebRTC currently supports a two-person interview call only; production-grade reliability still needs TURN configuration.
- Sandboxed code execution is not implemented yet; code is evaluated by AI review, not by running user code.
- Collaborative editor and WebRTC acceptance still need full multi-session smoke testing in a deployed or production-like environment.
- Automated test coverage is still intentionally small and needs expansion before production launch.
