# Phase 1: Identity, Roles & Profiles

## Goal

Make identity, role profiles, and parent-child linking reliable platform primitives before rebuilding tutor supply, discovery, enrollment, and progress.

## Current Baseline

Already available:

- `User` as account identity
- `Profile` as role identity
- `MobileClient`
- `AuthSession`
- Phone/password registration
- Access token and refresh token sessions
- Parent activation code
- Parent-student link
- User management profile read/update APIs

New Phase 1 foundation added:

- `GET /api/v1/identity/me`
- Shared `IdentityContext` TypeScript contract
- Mobile app identity context load after login/role load
- `requireProfile(req, res, role)` API ownership helper
- Profile completion score in identity context
- `PUT /api/v1/identity/student-education-profile`
- `PUT /api/v1/identity/tutor-profile`
- `GET /api/v1/identity/linked-children`
- `AuditLog` table and audit logging for auth/profile/parent-link actions

This endpoint returns:

- Authenticated user account
- Active profile for requested role
- All profiles owned by the user
- Tutor profile metadata when available
- Linked parents for student profiles
- Linked students for parent profiles
- Role permission list
- Profile completion percentage

## Phase 1 API Contract

### GET `/api/v1/identity/me`

Headers:

```http
Authorization: Bearer <accessToken>
```

Query:

```http
role=student | tutor | parent
```

Response shape:

```json
{
  "data": {
    "user": {
      "id": "user_id",
      "phone": "+917838920127",
      "status": "active",
      "createdAt": "2026-07-13T00:00:00.000Z",
      "updatedAt": "2026-07-13T00:00:00.000Z"
    },
    "activeProfile": {
      "id": "profile_id",
      "userId": "user_id",
      "role": "student",
      "firstName": "Apoorv",
      "lastName": "Gulati",
      "initials": "AG",
      "dob": "2010-06-24T00:00:00.000Z",
      "city": "Delhi",
      "communicationAddress": "South Delhi",
      "alternatePhone": null,
      "avatarUrl": null,
      "stream": "senior",
      "specialization": "CBSE Class 10 Mathematics",
      "profileCompletion": 86,
      "tutorProfile": null,
      "linkedParents": [],
      "linkedStudents": [],
      "createdAt": "2026-07-13T00:00:00.000Z",
      "updatedAt": "2026-07-13T00:00:00.000Z"
    },
    "profiles": [],
    "permissions": [
      "profile:manage",
      "tutor:discover",
      "program:enroll",
      "batch:request:create",
      "activity:complete",
      "parent:invite"
    ]
  }
}
```

## Role Permissions

Student:

- `profile:manage`
- `tutor:discover`
- `program:enroll`
- `batch:request:create`
- `activity:complete`
- `parent:invite`

Tutor:

- `profile:manage`
- `program:create`
- `program:draft:update`
- `program:publish`
- `batch:create`
- `batch:request:manage`
- `student:progress:view`

Parent:

- `child:profile:view`
- `child:program:view`
- `child:progress:view`
- `child:community:view`

## Next Implementation Tickets

1. Replace remaining frontend role assumptions with `/api/v1/identity/me`.
2. Expand `requireProfile(role)` usage across non-critical legacy mutations.
3. Add typed API client wrapper for identity context in mobile.
4. Add UI surfaces for dedicated tutor/student profile update APIs.
5. Expand audit logging to enrollment, content publish, and payment actions in later phases.

## Acceptance Criteria

- Every logged-in session can resolve user and active profile from API.
- Frontend no longer has to infer profile ownership from local role state.
- Parent links and student links are returned from one identity endpoint.
- Future APIs can enforce role ownership through one helper.

## Phase 1 Test Checklist

API tests:

1. Login as student `7838920127 / Student@123`.
2. Call `GET /api/v1/identity/me?role=student`.
3. Confirm response has:
   - `data.user.phone`
   - `data.activeProfile.role = student`
   - `data.permissions` contains `tutor:discover`
4. Login as tutor `7838920129 / Tutor@123`.
5. Call `GET /api/v1/identity/me?role=tutor`.
6. Confirm response has:
   - `data.activeProfile.role = tutor`
   - `data.activeProfile.tutorProfile`
   - `data.permissions` contains `program:create`
7. Login as parent `7838920130 / Parent@123`.
8. Call `GET /api/v1/identity/me?role=parent`.
9. Confirm response has:
   - `data.activeProfile.role = parent`
   - `data.activeProfile.linkedStudents`
   - `data.permissions` contains `child:progress:view`
10. Call identity endpoint without token and confirm `401 Unauthorized`.

Mobile tests:

1. Login as each role.
2. Confirm Account screen shows the logged-in user's name from API.
3. Logout and confirm previous identity is cleared.
4. Restart prototype and confirm no stale identity remains.
5. Parent login should continue to show linked child data if link exists.

Regression tests:

1. Profile update still works.
2. Tutor program create/edit still requires tutor login.
3. Published tutor program remains view-only.
4. Existing student discovery and batch request screens still load.

## DB Migration

DB migration is required for Phase 1 audit logging.

New migration:

- `202607130001_add_audit_log`

The existing schema already contains:

- `User`
- `Profile`
- `AuthSession`
- `MobileClient`
- `ParentActivationCode`
- `ParentStudentLink`

## API Deployment

Render deployment is required because `services/api/src/server.ts` changed.

Recommended deployment flow:

1. Commit and push code to `main`.
2. Trigger Render deploy from latest `main`.
3. Confirm `/health` returns DB connected.
4. Test `GET /api/v1/identity/me?role=<role>` using a fresh login token.

## Phase 1 Completion Status

Status: Complete for backend/platform foundation. Frontend has initial identity read integration and will continue screen-by-screen in later feature phases.

Completed:

- Identity context API.
- Identity shared contract.
- Mobile identity context read path.
- Reusable profile ownership helper.
- Initial conversion of profile update and tutor program endpoints to `requireProfile`.
- Profile completion score.
- Dedicated student education profile API.
- Dedicated tutor profile API.
- Parent linked-child selector API.
- Audit log schema and auth/profile/parent-link audit writes.

Deferred to later implementation phases:

- Replace every remaining frontend role assumption.
- Convert non-critical existing endpoints to `requireProfile`.
- Add audit logging for enrollment/content/payment workflows.
