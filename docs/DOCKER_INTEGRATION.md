# Docker Integration Plan

This document explains whether Docker is a good fit for this project and how to introduce it without fighting the current deployment model.

The project is a TypeScript monorepo:

```text
apps/web          Next.js frontend
apps/api          Hono API for Cloudflare Workers
packages/shared  Shared schemas and types
```

## Recommendation

Docker is a good idea for local development consistency and optional CI verification.

Docker should not replace the primary production deployment path yet:

- `apps/web` is naturally deployed to Vercel.
- `apps/api` is naturally deployed to Cloudflare Workers.
- Neon remains the hosted PostgreSQL database.

Use Docker to make local setup easier, not to force this app into a container-first production architecture.

## What Docker Should Solve

Docker can help with:

- consistent Node and pnpm versions
- one-command local startup
- isolated dependency installation
- local PostgreSQL for development if we want to stop relying on Neon during local work
- repeatable typecheck/build commands in CI
- onboarding contributors faster

Docker should not initially solve:

- production web hosting
- production Worker deployment
- production database hosting
- Cloudflare-specific runtime behavior

## Suggested Docker Scope

Start with three pieces:

```text
docker-compose.yml
Dockerfile.web
Dockerfile.api
```

Optional later:

```text
Dockerfile.dev
.dockerignore
docker/postgres/init.sql
```

## Local Development Options

There are two reasonable approaches.

### Option A: Docker For Dependencies Only

Use Docker for local PostgreSQL, but run web/API directly on the host.

This is the lightest approach.

Pros:

- simple debugging
- fast hot reload
- no container networking complexity for Next.js and Wrangler
- easy to keep using existing `pnpm dev`

Cons:

- developers still need Node and pnpm installed locally

Recommended if the team is small and comfortable with Node locally.

### Option B: Full Docker Compose Dev Environment

Run web, API, and Postgres in Docker Compose.

Pros:

- most consistent onboarding
- fewer host machine assumptions
- easy to reset environment

Cons:

- slower dependency installs
- more volume/watch configuration
- Cloudflare Worker development inside Docker can be more awkward
- debugging Wrangler networking can take extra time

Recommended only if local setup becomes painful.

## Recommended First Step

Start with Option A:

- add Docker Compose for Postgres only
- keep `pnpm dev` on the host
- document how to point `DATABASE_URL` at the local container

This gives the biggest practical benefit with the least disruption.

## Local Postgres Compose

Example `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ai-interview-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ai_interview
      POSTGRES_PASSWORD: ai_interview
      POSTGRES_DB: ai_interview
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_interview -d ai_interview"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres-data:
```

Local API `.dev.vars`:

```env
DATABASE_URL=postgresql://ai_interview:ai_interview@localhost:5432/ai_interview
JWT_SECRET=local-dev-secret-change-me
AI_PROVIDER=mock
AI_FALLBACK_TO_MOCK=true
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

Commands:

```bash
docker compose up -d postgres
pnpm --filter api db:migrate
pnpm dev
```

Stop local Postgres:

```bash
docker compose down
```

Reset local Postgres data:

```bash
docker compose down -v
docker compose up -d postgres
pnpm --filter api db:migrate
```

## Full Docker Compose Option

If we later want all services in Docker, use Compose services like:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8787
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8787:8787"
    environment:
      DATABASE_URL: postgresql://ai_interview:ai_interview@postgres:5432/ai_interview
      JWT_SECRET: local-dev-secret-change-me
      AI_PROVIDER: mock
      AI_FALLBACK_TO_MOCK: "true"
      CORS_ORIGIN: http://localhost:3000,http://127.0.0.1:3000
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ai_interview
      POSTGRES_PASSWORD: ai_interview
      POSTGRES_DB: ai_interview
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_interview -d ai_interview"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres-data:
```

This is useful later, but it should not be the first Docker milestone.

## Web Dockerfile

A production-ish `Dockerfile.web` could look like this:

```Dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter web build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/public apps/web/public
COPY --from=build /app/apps/web/package.json apps/web/package.json
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/web/node_modules apps/web/node_modules
COPY --from=deps /app/packages/shared packages/shared
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
```

This is mainly for experimentation. Vercel remains the better production target unless the hosting strategy changes.

## API Dockerfile

The API targets Cloudflare Workers, so Docker is less natural for production.

For local verification, a Dockerfile can run Wrangler:

```Dockerfile
FROM node:22-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
WORKDIR /app/apps/api
EXPOSE 8787
CMD ["pnpm", "dev"]
```

This is fine for local testing, but production should still use:

```bash
pnpm --filter api deploy
```

## .dockerignore

Add a `.dockerignore` to keep builds smaller:

```text
.git
.next
node_modules
apps/*/node_modules
packages/*/node_modules
apps/api/.wrangler
coverage
dist
*.log
.env
.env.*
apps/api/.dev.vars
```

Be careful with `.env` files. Do not bake secrets into images.

## Environment Variables

Docker should use local-only environment values.

Do not put production secrets in:

- Dockerfiles
- committed Compose files
- image build args
- `.env` files committed to Git

Use local `.env` files ignored by Git or secret managers in CI.

## Database Migrations

Local Docker Postgres still needs migrations.

Use:

```bash
pnpm --filter api db:migrate
```

If API runs inside Docker later, add a one-off migration command:

```bash
docker compose run --rm api pnpm db:migrate
```

Do not auto-run migrations on every container startup until the migration behavior is well understood.

## CI Usage

Docker can be useful in CI for:

- building the web image
- running typechecks in a clean environment
- starting Postgres for integration tests later

Minimum CI checks should still be:

```bash
pnpm -r typecheck
pnpm --filter web build
```

Docker is optional unless CI needs database-backed tests.

## Risks And Tradeoffs

Docker adds value, but also adds maintenance cost.

Risks:

- stale Dockerfiles after package changes
- slower local feedback loops
- extra networking issues
- confusion between Worker runtime and Node container runtime
- accidental secret leakage

Mitigation:

- start with Postgres-only Compose
- document commands clearly
- keep deployment docs centered on Vercel and Cloudflare
- add full app containers only when there is a real need

## Suggested Implementation Order

1. Add `.dockerignore`.
2. Add `docker-compose.yml` with Postgres only.
3. Document local `.dev.vars` for Docker Postgres.
4. Verify migrations against local Postgres.
5. Keep running web/API on host with `pnpm dev`.
6. Add full web/API Dockerfiles later only if needed.

## Definition Of Done

Docker integration is useful enough when:

- `docker compose up -d postgres` starts a local database
- API migrations run successfully against the local database
- `pnpm dev` can use the Docker database
- reset instructions are documented
- production deployment remains unchanged

## Final Opinion

Docker is worth adding, but start small.

The best first Docker milestone is local Postgres through Docker Compose. Full containerization of the Next.js app and Cloudflare Worker API can wait until there is a concrete need, because the current hosting model is already well matched to Vercel, Cloudflare Workers, and Neon.
