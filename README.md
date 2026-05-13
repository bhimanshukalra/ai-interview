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

Use the repo root as the Vercel project root. The included `vercel.json` builds the `web` workspace with `pnpm --filter web build` and serves the Next.js output from `apps/web/.next`.

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
- `CORS_ORIGIN` - deployed frontend origin, for example `https://ai-interview.example.com`

Production `AI_PROVIDER=gemini` and `AI_MODEL=gemini-2.5-flash` are set in `wrangler.jsonc`.

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

## TODO

- [x] Migrate frontend API calls from `fetch` to Axios.
- [x] Add authorization with JWT passed in request headers.
- [x] Validate JWT in Hono middleware.
- [x] Associate interviews with user id.
- [x] Prevent loading someone else's interview.
- [x] Add a real login/auth flow to issue and store user JWTs.
- [x] Require all questions to be answered before generating a report.
- [x] Show answered question progress.
- [x] Disable report generation until the interview is complete.
- [x] Return clean API errors for invalid Zod input.
- [x] Handle missing `DATABASE_URL`.
- [x] Show better frontend messages for API and report failures.
- [x] Test with `AI_PROVIDER=gemini`.
- [x] Improve Gemini question prompts.
- [x] Improve Gemini evaluation prompts.
- [x] Add a stricter scoring rubric.
- [x] Make report feedback more useful.
- [x] Configure Vercel deployment for `apps/web`.
- [x] Configure Cloudflare Workers deployment for `apps/api`.
- [x] Configure Neon environment variables.
- [x] Configure CORS for the deployed frontend URL.
- [x] Configure production `AI_*` environment variables.
- [ ] Add better loading states.
- [ ] Add "back to setup" and "restart interview" actions.
- [ ] Link the report page back to the interview.
- [ ] Add answer autosave or clearer save behavior.
