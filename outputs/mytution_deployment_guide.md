# myTution Deployment Guide

Last updated: 2026-06-24

## Target Setup

- Database: Neon Postgres
- API: Render Web Service
- Mobile builds: Expo EAS
- Environment: start with `staging`, then promote to `production`

## 1. Repo Prep Completed

The repo now includes:

- API support for hosted `PORT`.
- Prisma support for `DIRECT_URL`.
- Initial SQL migration at `packages/db/prisma/migrations/202606240001_init/migration.sql`.
- EAS build profiles at `apps/mobile/eas.json`.
- Local `.env.example` keys for API, DB, and Expo.

## 2. Neon DB Setup

You already created a Neon database and have a Postgres connection string.

Set these environment variables locally in your terminal. Do not commit these values.

```bash
export DATABASE_URL="YOUR_NEON_DATABASE_URL"
export DIRECT_URL="YOUR_NEON_DATABASE_URL"
```

For Neon, if you later enable a pooled connection string:

- `DATABASE_URL`: pooled URL for app/runtime
- `DIRECT_URL`: direct URL for Prisma migrations

## 3. Apply DB Schema To Neon

Preferred Prisma path:

```bash
npm run db:generate
npm run db:deploy
```

If Prisma schema engine fails, use the SQL migration directly:

```bash
psql "$DIRECT_URL" -f packages/db/prisma/migrations/202606240001_init/migration.sql
```

## 4. Seed Staging Mock Data

For staging/testing only:

```bash
npm run db:seed
```

Seeded rows use:

```text
sourceTag = mock
```

This makes future cleanup easy.

Example cleanup later:

```sql
DELETE FROM "Reminder" WHERE "sourceTag" = 'mock';
DELETE FROM "Recommendation" WHERE "sourceTag" = 'mock';
```

Use a careful ordered cleanup script because several tables have foreign keys.

## 5. Render API Deployment

Create a Render Web Service from the GitHub repo.

Recommended Render settings:

```text
Root Directory: .
Runtime: Node
Build Command: npm install --include=dev && npm run db:generate && npm run build --workspace services/api
Start Command: npm run start --workspace services/api
```

Render environment variables:

```bash
DATABASE_URL="YOUR_NEON_DATABASE_URL"
DIRECT_URL="YOUR_NEON_DATABASE_URL"
NODE_ENV="production"
NPM_CONFIG_PRODUCTION="false"
```

Do not set `PORT`; Render provides it.

After deployment:

```bash
curl https://YOUR_RENDER_API_URL/health
curl 'https://YOUR_RENDER_API_URL/api/v1/bootstrap?role=parent'
curl 'https://YOUR_RENDER_API_URL/api/v1/dis/dashboard?role=student'
```

## 6. Expo App API URL

For local mobile development against Render:

```bash
EXPO_PUBLIC_API_BASE_URL="https://YOUR_RENDER_API_URL"
npm run dev:mobile
```

For EAS builds, set the same env var in EAS:

```bash
cd apps/mobile
eas env:create --environment preview --name EXPO_PUBLIC_API_BASE_URL --value "https://YOUR_RENDER_API_URL"
```

## 7. Android APK Build

```bash
cd apps/mobile
eas build -p android --profile preview
```

The `preview` profile creates an APK.

## 8. iOS Simulator Build

```bash
cd apps/mobile
eas build -p ios --profile simulator
```

For physical iPhone testing, use an internal/ad hoc/TestFlight profile with Apple Developer credentials.

## 9. End-To-End Smoke Test

After DB + API + build are ready:

1. Open the app.
2. Select each role: Student, Tutor, Parent.
3. Confirm bootstrap/profile values load.
4. Create a reminder.
5. Check Render logs for `POST /api/v1/events-reminders`.
6. Confirm DB row exists in Neon.
7. Open Sessions and confirm education plan milestones load.
8. Sign out and confirm auth revoke endpoint is called.

## 10. Current Known Notes

- OTP is hardcoded as `123456`.
- MPIN is local-only for now.
- Chat remains placeholder until ChatKit SDK.
- Payments remain placeholder.
- Twilio OTP, token hashing, and device binding are future security improvements.
