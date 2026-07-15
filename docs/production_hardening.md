# Production Hardening Runbook

## API Smoke Tests

Run against local API:

```bash
npm run dev:api
API_BASE_URL=http://127.0.0.1:4000 npm run test:api:smoke
```

Run against Render:

```bash
API_BASE_URL=https://mytution.onrender.com ADMIN_API_TOKEN=<token> npm run test:api:smoke
```

The smoke runner covers:

- Health check with DB connectivity.
- Bootstrap persona.
- Register start and OTP verification.
- Student login/session creation through registration.
- Identity API with bearer token.
- Program catalog fetch.
- Notification fetch.
- Refresh-token rotation.
- Optional admin cleanup when `ADMIN_API_TOKEN` is available.

## Mobile Smoke Matrix

Test on Android emulator, iOS simulator, and one physical Android device before promoting a release.

| Area | Student | Tutor | Parent |
| --- | --- | --- | --- |
| Launch/auth | Splash, role landing, sign in, register | Splash, sign in, register | Activation-code registration |
| Home | Program journey, For you today, reminders, tutor recommendations | Leads, dashboard, recommendation carousel | Child replica home, progress-only views |
| Program | Select active program, complete activity, unlock milestone | Create draft, edit activity, publish/view-only | View child program, no mutation |
| Tutor marketplace | Search, filter, view tutor, request/purchase | Program/batch offerings visible | View-only where available |
| Batches | Request free/paid batch, status cards | Approve, deny, defer, suggest | Child class/reminder visibility |
| Community | Create, comment, react, report | Reply, react, report | Read-only child thread view |
| Payments | Paid program and paid batch mock payment | Orders/accounting screen | View-only payment-related child status |
| Notifications | Updates strip, mark read | Batch request updates | Invite/class/program updates |
| Account | Profile edit, parent invite, payments | Verification state, batch requests, payments | Linked child tracking |

## Observability

Current MVP instrumentation:

- `x-request-id` generated for every API response.
- Morgan logs include request ID in production.
- Error middleware logs method, path, request ID, message, and non-production stack traces.
- Process-level `unhandledRejection` and `uncaughtException` logging.
- Health endpoint validates DB connectivity.

Next production upgrade:

- Forward structured logs to Render log drain or Datadog.
- Add OpenTelemetry traces around Prisma and payment/notification providers.
- Add uptime monitor for `/health`.
- Add alerting for 5xx rate, login failures, payment failures, and migration failures.

## Rate Limiting

MVP rate limits are in-memory:

- Global API: `API_RATE_LIMIT_MAX` per `API_RATE_LIMIT_WINDOW_MS`.
- Auth routes: `AUTH_RATE_LIMIT_MAX` per `AUTH_RATE_LIMIT_WINDOW_MS`.

Render single-instance deployments can use this immediately. Multi-instance production should replace the store with Redis/Upstash while keeping the same middleware boundary.

## Token And Session Hardening

Implemented:

- Access and refresh token TTLs are environment-configurable.
- Refresh token rotation revokes the old session before issuing a new one.
- Login, refresh, and bearer-token reads reject non-active users.
- Revoke endpoint invalidates access and refresh tokens.

Recommended next:

- Store token hashes instead of raw tokens.
- Add per-device session metadata.
- Add suspicious login lockouts after repeated failures.

## File And Asset Limits

Implemented:

- JSON body limit via `API_JSON_BODY_LIMIT`.
- AMS static files reject path traversal and unsupported extensions.
- Static asset responses set `x-content-type-options: nosniff`.
- `AMS_MAX_STATIC_ASSET_BYTES` is reserved as the upload/file-size policy value.

When tutor uploads are added, enforce:

- Allowed MIME/extension allowlist.
- Virus scan or provider malware scan.
- Max file sizes per asset type.
- Private signed URLs for non-public content.

## DB Index Review

Added in Phase 12:

- User status lookup by creation time.
- Tutor verification/profile status review queues.
- Program marketplace and creator-status lookup.
- Tutor batch status/availability lookup.
- Payment order status/creation lookup.
- Audit entity lookup.

Review after live usage:

- Slow query logs from Neon.
- Tutor discovery filters by subject/grade/location.
- Program progress queries by selected program.
- Notification unread queries.
- Admin search queries.

## Seed And Mock Cleanup

Current seed data is tagged with `sourceTag = "mock"`.

Cleanup SQL:

```sql
DELETE FROM "AuditLog" WHERE "sourceTag" = 'mock';
DELETE FROM "Notification" WHERE "sourceTag" = 'mock';
DELETE FROM "Reminder" WHERE "sourceTag" = 'mock';
DELETE FROM "Recommendation" WHERE "sourceTag" = 'mock';
```

For relational mock users/programs, prefer admin soft-delete first, then hard-delete by phone through:

```bash
curl -X DELETE "$API_BASE_URL/api/v1/admin/users/by-phone?phone=<phone>&mode=hard" \
  -H "x-admin-token: $ADMIN_API_TOKEN" \
  -H "x-admin-actor: cleanup"
```

Before production launch:

- Move demo accounts into a separate seed profile.
- Require explicit `SEED_PROFILE=demo` for mock marketplace data.
- Keep static AMS examples, but mark them demo-owned and replace with tutor-created content over time.

## Environment Config Checklist

Render API:

- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_API_TOKEN`
- `NODE_ENV=production`
- `API_ALLOWED_ORIGINS`
- `API_JSON_BODY_LIMIT`
- `API_RATE_LIMIT_WINDOW_MS`
- `API_RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`

Expo/mobile:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_HOME_CAROUSEL_MAX`
- `EXPO_PUBLIC_HOME_REMINDERS_MAX`

Do not keep production secrets in app config or committed `.env` files.
