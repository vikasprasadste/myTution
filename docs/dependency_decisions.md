# myTution Dependency and Hosting Decisions

## Current Decision

The first production-ready scaffold uses a TypeScript monorepo with three tiers:

- Frontend: Expo React Native app in `apps/mobile`.
- API: Node.js TypeScript REST API in `services/api`.
- Database: PostgreSQL schema managed by Prisma in `packages/db`.

The first local environment uses Docker PostgreSQL and seed data. Hosted deployment is documented but not locked until account/provider decisions are made.

## Frontend Dependencies

Core:
- `expo`
- `react`
- `react-native`
- `expo-router`
- `react-native-safe-area-context`
- `react-native-screens`
- `expo-linking`
- `expo-constants`
- `expo-status-bar`

UI and device features:
- `expo-image-picker` for camera/gallery avatar upload.
- `expo-local-authentication` for biometrics.
- `expo-secure-store` for MPIN/session token storage.
- `expo-notifications` for reminders and class alerts.
- `lucide-react-native` for consistent icons.

State/data:
- `@tanstack/react-query` for API data fetching and caching.
- `zod` for runtime validation.

Development:
- `typescript`
- `eslint`

## API Dependencies

Core:
- `express`
- `cors`
- `helmet`
- `morgan`
- `dotenv`
- `zod`
- `tsx`
- `typescript`

Database:
- `@mytution/db` workspace package.
- `@prisma/client`
- `prisma`
- `pg`

Authentication and security:
- `jsonwebtoken`
- `bcryptjs`

Future production add-ons:
- OTP provider SDK, e.g. Twilio, MSG91, Gupshup, or AWS SNS.
- Payment gateway SDK, e.g. Razorpay/Cashfree/PhonePe PG.
- Object storage SDK, e.g. AWS S3, Cloudflare R2, or Supabase Storage.

## Shared Packages

- `@mytution/config`: feature flags, environment config, role palette, app metadata.
- `@mytution/shared`: shared TypeScript domain types and constants.
- `@mytution/db`: Prisma schema/client helpers and seed data.

## Feature Flag Strategy

Feature flags live in `packages/config/src/featureFlags.ts`.

Each feature has:
- `enabled`: global on/off.
- Optional `roles`: role allow-list.
- Optional `description`.

Frontend screens/components use `isFeatureEnabled(flag, role)`.
API routes should also check the same flags before exposing feature behavior.

## Hosting Decision

Recommended path:
- Mobile builds: Expo Application Services (EAS).
- API: Render, Fly.io, Railway, or AWS ECS/Fargate.
- Database: Supabase Postgres, Neon, Prisma Postgres, or AWS RDS.
- Assets: Supabase Storage, Cloudflare R2, or AWS S3.

Initial local decision:
- PostgreSQL via `infra/docker-compose.yml`.
- API via `npm run dev --workspace services/api`.
- Mobile via `npm run start --workspace apps/mobile`.

## Initial Data

Seed data includes:
- Student: Apoorv Gulati.
- Tutor: Ankit Sharma.
- Parent: Sarmishtha Gulati.
- Role-specific recommendations.
- Programs and milestones.
- Sample reminders.
- Feature flags enabled for prototype-critical flows.

## Sources Checked

- Expo quick start recommends `npx create-expo-app@latest`.
- Expo Router installation lists router, safe area, screens, linking, constants, and status bar as required dependencies.
- Prisma PostgreSQL quickstart lists Prisma CLI/client, pg adapter/driver, and dotenv for TypeScript PostgreSQL setup.
