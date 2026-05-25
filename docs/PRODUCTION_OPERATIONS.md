# Production Operations Runbook

This runbook captures the minimum production operations habits for the AI interview MVP.

The goal is not to make the project heavy. The goal is to have a repeatable deploy path, clear smoke checks, useful logs, and an obvious rollback path when something goes wrong.

## Release Verification

Run the release verification command before deploying production changes:

```bash
pnpm verify:release
```

This currently runs:

```text
pnpm -r typecheck
pnpm --filter web build
pnpm --filter api test:gemini
```

Use this as the default pre-deploy check. Add focused tests as the test suite grows.

## Production Configuration Checklist

Vercel web app:

- `NEXT_PUBLIC_API_URL` points to the deployed Cloudflare Worker API.
- The Vercel project root is `apps/web`.
- The deployed frontend URL is included in the API `CORS_ORIGIN` secret.

Cloudflare Worker API:

- `DATABASE_URL` is set with a Neon pooled PostgreSQL connection string.
- `JWT_SECRET` is a long random secret and is not shared with local development.
- `AI_API_KEY` is set for Gemini.
- `CORS_ORIGIN` includes only trusted frontend origins.
- `AI_PROVIDER=gemini` and `AI_MODEL=gemini-2.5-flash` are configured in `wrangler.jsonc`.
- `AI_FALLBACK_TO_MOCK` is not enabled for production.
- Worker observability remains enabled in `apps/api/wrangler.jsonc`.
- Source maps remain enabled so production stack traces can be investigated.

Realtime collaboration service:

- `DATABASE_URL` points at the same database used by the API.
- `JWT_SECRET` matches the API secret so socket auth validates the current bearer token.
- `CORS_ORIGIN` includes only trusted frontend origins.
- Realtime logs are reviewed for socket auth failures, forbidden joins, snapshot save failures, and room cleanup.

Neon database:

- Migrations have been applied before the API release depends on new schema.
- Production migration commands are run intentionally from `apps/api`.
- A recent backup or restore point exists before risky schema changes.

## Deployment Flow

1. Run `pnpm verify:release`.
2. Apply database migrations from `apps/api` when the release needs schema changes.
3. Deploy the API with `pnpm --filter api deploy`.
4. Deploy the web app through Vercel.
5. Run the smoke checks below against production.

For schema-changing releases, prefer additive migrations first, deploy code second, then clean up old fields in a later release.

## Smoke Checks

Run these checks after deployment:

- API health returns a successful response from `/health`.
- Web app loads without console or network errors.
- Register a test user or log in with a known test account.
- Create a new interview.
- Answer a question and save it.
- For a technical-style interview, enter code, save the answer, and confirm the code appears in the report.
- For a technical-style interview, confirm the collaborative code editor connects and shows the current participant.
- Finish an interview and confirm the report shows score, feedback, follow-up prompts, and signal breakdown.
- Return to the dashboard and confirm the completed interview appears in history.
- Log out and log back in, then confirm protected data still loads.

## Collaborative Code Room Acceptance

Run this checklist before calling the collaborative editor integration complete:

- Owner can join their own interview code room.
- Another user cannot join someone else's room.
- Candidate/interviewer participant access works when `interview_participants` rows exist.
- Interviewers can join the room but see a read-only editor.
- Two authorized sessions see the same code.
- Typing syncs both ways.
- Remote cursor and selection appear.
- Presence updates on join and leave.
- Refresh restores latest code.
- Temporary disconnect reconnects to the same document.
- Server restart restores latest persisted snapshot.
- Saving an answer stores latest code in `interview_answers`.
- Report shows saved code.
- AI evaluation includes saved code.
- Completed/report-ready interviews do not accept answer saves or collaborative edits.

If any smoke check fails, stop the release and follow the rollback section.

## Logging Review

The API has centralized logging helpers in:

```text
apps/api/src/logger.ts
```

Current expectations:

- Unexpected route errors are logged through the error middleware.
- Warnings and errors should include enough context to debug the failing path.
- Logs must not include passwords, JWTs, API keys, full database URLs, or candidate private data beyond what is needed to diagnose a failure.
- User-facing API errors should stay clear without leaking internals.

When adding new production paths, prefer structured context that can be searched in Cloudflare logs. Keep sensitive values out of log payloads.

## Failure Monitoring

Cloudflare Workers:

- Check Worker logs after deploys and after smoke test failures.
- Use Cloudflare observability for error rates, invocation count, and latency spikes.
- Watch AI provider failures separately from validation errors.

Vercel:

- Check deployment status and runtime logs after each frontend release.
- Investigate hydration, build, and API connectivity errors quickly because they block the main interview flow.

Neon:

- Monitor connection errors, slow queries, and migration failures.
- Treat sudden auth/interview/report failures after a deploy as possible database compatibility issues.

Gemini:

- Track generation and evaluation failures.
- Confirm prompt hardening remains in place when changing prompts.
- Keep mock fallback limited to local or non-production environments.

## Secret Rotation Notes

Rotate secrets when a teammate leaves, a key is suspected to be exposed, provider access changes, or on a regular maintenance cadence.

Cloudflare Worker secrets:

- Rotate `AI_API_KEY` in Gemini first, then update the Cloudflare secret with `wrangler secret put AI_API_KEY`.
- Rotate `JWT_SECRET` carefully because existing sessions become invalid. Schedule this as a planned logout event.
- Rotate `DATABASE_URL` by creating a new Neon credential, updating the Cloudflare secret, validating the app, then revoking the old credential.
- Rotate `CORS_ORIGIN` whenever frontend production domains change.

After rotating any secret, redeploy if needed and run the smoke checks.

## Rollback Notes

Frontend rollback:

- Use Vercel's deployment history to promote the previous known-good deployment.
- After rollback, confirm the web app points at the expected API URL.

API rollback:

- Use Cloudflare Workers deployment history to roll back to the previous known-good deployment, or redeploy the previous commit.
- After rollback, run `/health` and the critical smoke checks again.

Database rollback:

- Treat migrations as forward-only unless a tested rollback SQL script exists.
- Prefer additive migrations so older and newer app versions can run during rollback.
- If a destructive migration caused the incident, restore from a known-good backup or restore point.

AI/provider rollback:

- If Gemini behavior changed because of prompt or model changes, redeploy the previous API version.
- Do not enable mock fallback in production as a hidden workaround unless that is an explicit incident decision.

## Incident Checklist

When production is unhealthy:

1. Identify whether the failure is web, API, database, or AI provider related.
2. Capture the failing URL, user action, timestamp, and relevant request ID/log entry.
3. Check recent deploys and migrations.
4. Roll back the smallest affected surface.
5. Re-run smoke checks.
6. Write down the root cause and the guardrail that would have caught it earlier.
