# myTution Monorepo

This repo contains the first working application scaffold for myTution.

## Architecture

- `apps/mobile`: Expo React Native frontend.
- `services/api`: Node.js TypeScript REST API.
- `packages/db`: Prisma PostgreSQL schema and seed data.
- `packages/config`: feature flags, role themes, app config.
- `packages/shared`: shared domain types.
- `infra`: local infrastructure such as Docker PostgreSQL.

## Feature Flags

Feature flags live in:

`packages/config/src/featureFlags.ts`

Use `isFeatureEnabled(flag, role)` in frontend and API code. If a flag is disabled, related screens/components/routes should be hidden or unavailable.

## Local Setup

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run db:generate
```

Start local PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Run migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

Start API:

```bash
npm run dev:api
```

Start mobile app:

```bash
npm run dev:mobile
```

## Hosting Direction

- Mobile: Expo Application Services.
- API: Render, Fly.io, Railway, AWS ECS/Fargate, or equivalent.
- DB: Supabase Postgres, Neon, Prisma Postgres, or AWS RDS.
- Assets: Supabase Storage, Cloudflare R2, or S3.

The current API can run against mock data while the hosted database decision is finalized.
