# Phase 2: Tutor Supply Engine

## Goal

Make tutors the supply-side starting point of the platform. Tutors should be able to create and manage profile supply, programs, batches, pricing, and publishable inventory that students can discover and parents can observe downstream.

## Phase 2 Slice 1: Supply Foundation

Status: Implemented locally, not yet committed.

This slice adds the backend foundation for tutor-owned supply management:

- Tutor verification/profile status fields
- Batch status/pricing fields
- Optional batch-to-program linkage
- Tutor supply read API
- Tutor batch CRUD/soft-archive APIs
- Program publish/archive APIs
- Published program immutability guard
- Draft program creation without requiring milestones immediately

## DB Migration

New migration:

- `202607130002_add_tutor_supply_fields`

Adds:

- `TutorProfile.verificationStatus`
- `TutorProfile.profileStatus`
- `TutorBatch.programId`
- `TutorBatch.status`
- `TutorBatch.feeType`
- `TutorBatch.feeAmount`

## API Endpoints

### Tutor Supply Overview

```http
GET /api/v1/tutor/supply
Authorization: Bearer <tutorAccessToken>
```

Returns:

- Tutor identity/profile
- Tutor programs
- Tutor batches
- Tutor supply analytics

### Tutor Supply Analytics

```http
GET /api/v1/tutor/supply/analytics
Authorization: Bearer <tutorAccessToken>
```

Returns:

- Program counts by lifecycle
- Batch counts by availability/status
- Batch request counts by status
- Active enrollment count

### List Tutor Batches

```http
GET /api/v1/tutor/batches
Authorization: Bearer <tutorAccessToken>
```

### Create Tutor Batch

```http
POST /api/v1/tutor/batches
Authorization: Bearer <tutorAccessToken>
Content-Type: application/json
```

Example:

```json
{
  "programId": "optional_tutor_program_id",
  "title": "Class 10 Board Crash Batch",
  "course": "Class 10 Board Exam 2 Month Crash Course",
  "subject": "Mathematics",
  "grade": "Class 10",
  "board": "CBSE",
  "mode": "online",
  "schedule": "Mon, Wed, Fri - 7:00 PM",
  "onlineLink": "https://meet.example.com/class-10-crash",
  "startsAt": "2026-08-01T13:30:00.000Z",
  "capacity": 20,
  "status": "available",
  "feeType": "paid",
  "feeAmount": 2500
}
```

### Update Tutor Batch

```http
PUT /api/v1/tutor/batches/:id
Authorization: Bearer <tutorAccessToken>
Content-Type: application/json
```

### Archive Tutor Batch

```http
POST /api/v1/tutor/batches/:id/archive
Authorization: Bearer <tutorAccessToken>
```

### Publish Tutor Program

```http
POST /api/v1/education-plan/tutor/programs/:id/publish
Authorization: Bearer <tutorAccessToken>
```

Rules:

- Program must belong to the tutor.
- Program must have at least one milestone.
- Every milestone must have at least one activity.
- Published program becomes view-only.

### Archive Tutor Program

```http
POST /api/v1/education-plan/tutor/programs/:id/archive
Authorization: Bearer <tutorAccessToken>
```

## Acceptance Criteria

- Tutor can fetch their supply overview.
- Tutor can create a batch linked to one of their programs.
- Tutor cannot link a batch to another tutor's program.
- Tutor can update and archive their own batches.
- Tutor cannot update someone else's batch.
- Tutor can publish a draft program once milestones and activities exist.
- Tutor cannot update a published program.
- Student discovery continues to see only published programs.
- Tutor can see supply analytics derived from API data.
- Tutor can publish/archive programs from the mobile Program screen.
- Tutor can create, update, and archive batches from the mobile supply hub.

## Phase 2 Slice 2: Mobile Tutor Supply

Status: Implemented locally, not yet committed.

This slice exposes the Phase 2 supply APIs in the app:

- Tutor supply hub with program, batch, request, and enrollment counts
- Batch builder for tutor-created batches
- Batch edit and archive actions
- API-driven refresh for tutor supply

## Phase 2 Slice 3: Program Lifecycle Controls

Status: Implemented locally, not yet committed.

This slice adds mobile controls for:

- Publishing a draft program after milestones and activities are configured
- Archiving tutor programs
- Keeping published programs view-only
- Displaying lifecycle status in the Program screen

## Test Checklist

1. Login as tutor `7838920129 / Tutor@123`.
2. Call `GET /api/v1/tutor/supply`.
3. Create a draft tutor program using `POST /api/v1/education-plan/tutor/programs` with `visibility = private`.
4. Create a batch using `POST /api/v1/tutor/batches`.
5. Confirm the batch appears in `GET /api/v1/tutor/batches`.
6. Update the batch using `PUT /api/v1/tutor/batches/:id`.
7. Archive the batch using `POST /api/v1/tutor/batches/:id/archive`.
8. Try updating a published program and confirm `409`.
9. Confirm student discovery still shows published tutor programs only.
10. Open the mobile tutor supply hub and confirm analytics cards are populated from API.
11. Publish a draft program from mobile and confirm it becomes discoverable.
12. Archive a program from mobile and confirm it disappears from active tutor supply.

## Next Phase 2 Slices

1. Program versioning for post-publish edits.
2. Tutor supply analytics events: views, detail opens, program purchases.
3. Tutor roster screen per batch.
4. Student discovery recommendation ranking based on tutor supply quality.
