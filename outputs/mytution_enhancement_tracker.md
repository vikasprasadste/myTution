# myTution Enhancement Tracker

Last updated: 2026-06-23

## Current Integration Status

- Expo app now calls the API for bootstrap, recommendations, events/reminders, DIS dashboard information, and education plan.
- API now reads/writes through Prisma instead of in-memory mock arrays.
- Mock test data is seeded into the DB with `sourceTag = "mock"` for future cleanup.
- Local fallback remains in the Expo app so screens still render if the API is unavailable.

## Implemented Service Boundaries

### Authentication API

- `POST /api/v1/auth/register/start`
- `POST /api/v1/auth/register/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/revoke`

Current behavior:

- OTP is hardcoded as `123456`.
- Access token and refresh token are generated and stored in `AuthSession`.
- `MobileClient` seed row is created with `clientId = mytution_mobile_app`.
- Duplicate phone during registration returns a generic `Something went wrong`.
- MPIN remains local-only for now.

Future:

- Integrate Twilio OTP.
- Hash/store token digests instead of raw tokens.
- Add device binding and token rotation policies.

### User Management API

- `GET /api/v1/usermanagement/profile?role=student|tutor|parent`
- `PUT /api/v1/usermanagement/profile`

Current behavior:

- Profile data is stored in `UserManagement`.
- Existing `Profile` remains in place for app role/profile relationships and education progress.

Future:

- Add profile image upload.
- Add field-level validation and audit log.

### Education Plan API

- `GET /api/v1/education-plan/current?role=student|tutor|parent`
- `GET /api/v1/programs/current?role=...` compatibility route
- `GET /api/v1/resources/:id`
- `POST /api/v1/resources/:id/complete`

Current behavior:

- Education plan data is stored in `Program`, `ProgramMilestone`, and `MilestoneActivity`.
- Activities support video, article, flashcard, and quiz.
- Activity statuses support pending, in-progress, and complete.

Future:

- Enforce milestone unlocking after previous milestone completion.
- Add full quiz attempts and scores.
- Add richer video/article/flashcard content models.

### Events & Reminders API

- `GET /api/v1/events-reminders?role=...`
- `POST /api/v1/events-reminders`
- `PATCH /api/v1/events-reminders/:id`
- `DELETE /api/v1/events-reminders/:id`

Current behavior:

- Events/reminders are persisted in Prisma `Reminder`.
- Delete marks reminders as `cancelled`.

Future:

- Add event vs reminder type.
- Add notification scheduling.
- Add recurrence.

### DIS Dashboard Information API

- `GET /api/v1/dis/dashboard?role=...`

Current behavior:

- Aggregates reminders, education plan progress, and recommendation counts.
- Mobile dashboard cards use this API when available.

Future:

- Query dedicated service APIs instead of direct DB aggregation.
- Add role-specific dashboard policies.

## Deferred Integrations

- Chat: keep current placeholder until ChatKit SDK integration.
- Payments: keep current placeholder until payment gateway/provider decision.
- Twilio: pending OTP integration.
- Hosted DB/API: pending provider decision.
- APK/IPA: should be created after API base URL is configured for live/staging.

## Local Verification Commands

```bash
npm run db:generate
npm run typecheck --workspaces --if-present
curl http://localhost:4000/health
```

## Notes

- For device testing, `EXPO_PUBLIC_API_BASE_URL` must point to a reachable API URL. `localhost` works for web/iOS simulator in some cases, but physical devices need a LAN IP or hosted API URL.
- Mock cleanup can target rows where `sourceTag = "mock"`.
