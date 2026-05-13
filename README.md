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
- [ ] Make report feedback more useful.
- [ ] Configure Vercel deployment for `apps/web`.
- [ ] Configure Cloudflare Workers deployment for `apps/api`.
- [ ] Configure Neon environment variables.
- [ ] Configure CORS for the deployed frontend URL.
- [ ] Configure production `AI_*` environment variables.
- [ ] Add better loading states.
- [ ] Add "back to setup" and "restart interview" actions.
- [ ] Link the report page back to the interview.
- [ ] Add answer autosave or clearer save behavior.
