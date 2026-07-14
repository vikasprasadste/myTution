# myTution Platform Redevelopment Plan

## 1. Objective

Rebuild myTution as a tutor-led learning marketplace platform, not just a role-based mobile app.

The platform source of truth should be:

1. Tutors create supply: profiles, programs, batches, content, pricing, schedules.
2. Students discover and enroll into tutor-created supply.
3. Parents get view-only tracking for linked students.

All app screens, API responses, and database relationships should follow this platform model.

## 2. Core Platform Principles

- Tutor-created supply drives the marketplace.
- Student and parent experiences are downstream of real tutor, program, batch, and enrollment data.
- No production feature should depend on static fallback data.
- Every mutable action must be linked to a user, profile, role, and ownership context.
- Learning progress must be per student/profile/enrollment, never global on a program or activity.
- Published programs should be immutable; edits should happen through drafts or new versions.
- Parents are strictly view-only for child-linked data.
- Paid/free access must be enforced by API entitlement checks.

## 3. Target Domain Model

Primary entities:

- User
- Profile
- TutorProfile
- StudentProfile
- ParentProfile
- ParentStudentLink
- Program
- ProgramVersion
- ProgramMilestone
- MilestoneActivity
- Resource
- Asset
- Batch
- BatchRequest
- Enrollment
- ProgramEnrollment
- BatchEnrollment
- ActivityProgress
- ResourceProgress
- QuizAttempt
- Review
- CommunityThread
- CommunityComment
- CommunityReaction
- PaymentOrder
- TutorPayout
- AuditLog

## 4. Redevelopment Phases

### Phase 0: Platform Reset & Specification

Goal: Convert current app specs into platform-first specs.

Deliverables:

- Update `prd_spec.md`
- Update `design_spec.md`
- Update `api_spec.md`
- Update `db_spec.md`
- Create entity relationship map
- Create role-wise journey map
- Define feature flags by phase
- Identify current code to keep, refactor, or replace

Acceptance criteria:

- Tutor, student, and parent journeys are defined as platform journeys.
- Database ownership and access rules are documented.
- API boundaries are clear by service domain.

### Phase 1: Identity, Roles & Profiles

Goal: Make identity and profile data reliable before building marketplace flows.

Build:

- Phone/password authentication
- Access token and refresh token flow
- User table as account identity
- Profile table as role identity
- Tutor profile details
- Student education profile
- Parent profile
- Parent-child linking
- Role-based authorization middleware

Key rules:

- User owns one or more profiles over time.
- MVP can allow one active role per session.
- Every API mutation must check profile ownership.

Acceptance criteria:

- Tutor, student, and parent can register/login through API only.
- Profile data is persisted and fetched from DB.
- Parent-child link works through activation code.

### Phase 2: Tutor Supply Engine

Goal: Make tutors the supply-side starting point of the platform.

Build:

- Tutor onboarding and profile completion
- Tutor verification status
- Tutor subjects, boards, grades, languages, location, mode, pricing
- Program builder
- Milestone builder
- Activity/content builder
- Draft/in-progress/published program lifecycle
- Batch builder
- Online/offline batch configuration
- Free/paid program configuration
- Capacity, schedule, location, and meeting link configuration

Program lifecycle:

- Draft
- In progress
- Published
- Archived
- Unpublished

Acceptance criteria:

- Tutor can create a draft program.
- Tutor can add milestones and activities.
- Tutor can publish a program.
- Published program becomes view-only.
- Tutor can create online/offline batches for a program.

### Phase 3: Asset & Content Management

Goal: Make content reusable, access-controlled platform assets.

Build:

- Asset Management Service abstraction
- Repo-backed storage for MVP
- Future-ready adapter for S3/R2
- Article content
- Video content
- Thumbnail and banner
- Subtitle/VTT
- Flashcard JSON
- Quiz JSON
- Content ownership by tutor
- Content access rules

Acceptance criteria:

- App receives all content assets through API.
- Student can access only entitled content.
- Parent can view child-entitled content in read-only mode.
- Tutor can edit content only before publishing.

### Phase 4: Student Discovery & Marketplace Home

Goal: Students discover tutors and programs before starting a journey.

Build:

- Recommended tutors on home screen
- Recommended programs on home screen
- Tutor search and filters
- Tutor profile detail
- Tutor program offerings
- Tutor batch offerings
- Add free program
- Request batch admission
- Paid program purchase placeholder

Recommendation inputs:

- Student class/grade
- Board
- Subject interests
- City/location
- Mode preference
- Language preference
- Tutor rating
- Tutor availability

Acceptance criteria:

- Student home shows tutor/program recommendations from API.
- Search uses DB-backed tutor supply.
- Student can view tutor details and program/batch offerings.
- Student can tap home marketplace cards and land on the relevant tutor detail.
- Free tutor programs can be added to the student's active program list.
- Paid tutor programs record purchase interest until payment/order service is built.
- Batch CTAs reflect request/enrollment state for the signed-in student.

Status:

- Completed in code through `GET /api/v1/marketplace/recommendations`, DB-backed tutor discovery, tutor detail program/batch CTAs, free-program add, paid-program interest logging, and batch request state display.
- No Neon migration was needed for Phase 4. The phase reuses tutor profile, program, batch, student program selection, batch request, batch enrollment, and audit log tables.
- Next phase should turn batch request approval, suggested batches, paid order creation, and enrollment state into a stronger workflow.

### Phase 5: Enrollment Workflow

Goal: Connect tutor supply and student demand with a reliable workflow.

Build:

- Batch admission request
- Tutor approve
- Tutor deny
- Tutor defer
- Tutor suggest another batch
- Student accepts suggested batch
- Enrollment creation
- Batch roster
- Student class list
- Schedule/event generation

Request statuses:

- Requested
- Approved
- Denied
- Deferred
- Suggested
- Accepted
- Enrolled
- Cancelled

Acceptance criteria:

- Student can request a batch.
- Tutor can act on request.
- Approved request creates enrollment.
- Student sees enrolled batch/classes.
- Tutor sees batch roster.

Status:

- Core workflow complete.
- Completed: students can request a batch from tutor discovery/tutor detail.
- Completed: tutors can approve, deny, defer, or suggest another batch.
- Completed: student can accept a tutor-suggested alternate batch; original suggested request is dismissed and a pending request is created for the alternate batch.
- Completed: students can withdraw pending/suggested batch requests; withdrawn requests move to `cancelled`.
- Completed: tutor approval creates active enrollment, refreshes request/class/tutor supply state, and updates dashboard class metrics.
- Completed: student request cards show suggested batch detail and a compact enrollment request timeline.
- Completed: student class cards open to a detail screen with tutor, timing, joining state, classmates, and request history.
- Completed: tutor batch roster drill-down shows enrolled students and pending request count.
- Completed: parent class hub shows linked child classes in view-only mode.
- Completed: DIS dashboard cards use live enrollment/request counts instead of static mock values.
- Completed: approved batch schedules automatically create idempotent in-app reminders for the student and active linked parents.
- Neon migration added in `202607140001_add_cancelled_batch_request_status` for the `BatchRequestStatus.cancelled` enum value.
- Remaining outside the core workflow: paid order/payment intent and push/in-app notification delivery.

Phase 5 consolidated test matrix:

- Student requests an available tutor batch.
- Tutor sees the request under batch requests.
- Tutor denies, defers, and suggests another batch; student sees the correct status card.
- Student accepts a suggested batch and sees a new pending request.
- Student withdraws a pending request and it moves to `cancelled`.
- Tutor approves a pending request; an active enrollment is created.
- Approval creates one active schedule reminder for the student and linked parent accounts without duplicates on re-approval.
- Student sees the approved class in `Classes` and can open class details.
- Tutor sees the approved student in batch roster drill-down.
- Parent linked to the student sees the child class in view-only mode.
- Dashboard cards update with live class/student/lead counts after Render deploy.

### Phase 6: Program Progress & Learning Activity Tracking

Goal: Track student learning truthfully per enrolled/selected program.

Build:

- Program enrollment progress
- Milestone unlock state
- Per-user activity progress
- Resource progress
- Quiz attempts and scores
- Flashcard completion
- Article/video completion
- Program completion
- Activity timeline

Rules:

- Progress is scoped to student profile and program enrollment.
- Activity completion by one student must not affect others.
- Parent reads child progress only.
- Tutor can view aggregate and per-student progress for enrolled students.

Acceptance criteria:

- Student completion updates DB through API.
- Parent sees child progress in read-only mode.
- Tutor sees student progress for own batches/programs.

### Phase 7: Parent Monitoring Experience

Goal: Make parent role useful while staying view-only.

Build:

- Child program progress dashboard
- Batch schedule visibility
- Attendance placeholder
- Quiz score visibility
- Weekly learning summary
- Tutor notes placeholder
- Payment status placeholder
- Progress alerts

Parent restrictions:

- Cannot complete activities.
- Cannot comment or react in community.
- Cannot edit child profile or program state.
- Can only view linked child data.

Acceptance criteria:

- Parent sees child home and program progress from API.
- Parent can switch between linked children, later.
- Parent cannot mutate learning state.

### Phase 8: Trust, Reviews & Marketplace Quality

Goal: Build confidence in tutor discovery and enrollment.

Build:

- Verified tutor status
- Reviews linked to enrollment
- Rating aggregation
- Review dimensions
- Report/moderation hooks
- Tutor profile quality score

Review dimensions:

- Teaching quality
- Punctuality
- Communication
- Value for money

Acceptance criteria:

- Only enrolled students/parents can review.
- Tutor rating is calculated from real reviews.
- Reviews are visible on tutor detail.

### Phase 9: Payments & Monetization

Goal: Prepare platform revenue flows.

Build:

- Payment order model
- Program purchase model
- Batch fee model
- Payment status
- Refund/cancellation state
- Commission configuration
- Tutor payout placeholder
- Subscription model placeholder

Acceptance criteria:

- Paid program/batch creates payment intent/order.
- Content access depends on successful payment or enrollment.
- Tutor revenue can be calculated from DB.

### Phase 10: Admin & Operations

Goal: Give the platform operational control.

Build:

- Admin dashboard
- Tutor verification workflow
- User search
- Program moderation
- Content moderation
- Batch monitoring
- Support/refund tooling
- Analytics dashboard
- Audit logs

Acceptance criteria:

- Admin can inspect core platform entities.
- Risky actions are audit logged.
- Marketplace quality can be monitored.

## 5. API Service Domains

Recommended service boundaries:

- Auth API
- User Management API
- Tutor Profile API
- Program API
- Asset Management API
- Discovery API
- Batch & Enrollment API
- Progress API
- Parent Monitoring API
- Reviews API
- Community API
- Dashboard Information Service
- Payments API
- Admin API

## 6. Frontend Refactor Direction

Tutor app priorities:

- Profile completion
- Program builder
- Batch builder
- Leads and batch requests
- Student roster
- Program/content analytics

Student app priorities:

- Recommended tutors/programs
- Tutor search
- Tutor detail
- Program purchase/add
- Batch request
- My programs
- My classes
- Progress

Parent app priorities:

- Child dashboard
- Program progress
- Batch schedule
- Quiz/activity performance
- Tutor notes
- Alerts

## 7. Migration Strategy From Current App

Keep:

- Existing auth token direction
- Existing role-based theme foundation
- Existing prototype screens as UX reference
- Existing Prisma/Express/Expo monorepo structure
- Existing activity progress concept
- Existing parent activation concept
- Existing tutor search direction

Refactor:

- Program model into tutor-created supply
- Student home into marketplace discovery
- Parent screens into child-linked read-only views
- Community permissions
- Dashboard data aggregation
- Tutor program builder

Replace:

- Static seeded learning journeys as primary source
- Any local fallback used in production flows
- Global activity progress assumptions
- Demo-style dashboard cards

## 8. Suggested Execution Order

1. Phase 0: Finalize specs and platform model.
2. Phase 1: Clean identity/profile/role access.
3. Phase 2: Build tutor supply engine.
4. Phase 3: Stabilize content/asset service.
5. Phase 4: Build student discovery.
6. Phase 5: Build enrollment workflow.
7. Phase 6: Build learning progress.
8. Phase 7: Build parent monitoring.
9. Phase 8 onward: Trust, monetization, admin.

## 9. Immediate Next Phase Checklist

Phase 0 should produce:

- Platform ERD
- Updated DB schema proposal
- Updated API endpoint list
- Updated role journeys
- Refactor backlog
- Phase 1 implementation tickets
- Phase 2 implementation tickets

Once Phase 0 is complete, implementation should begin with identity/profile cleanup, then tutor supply creation.
