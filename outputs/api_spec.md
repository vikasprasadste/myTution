# myTution API Specification

## 1. API Style

- REST JSON API for MVP.
- Base path: `/api/v1`.
- Auth: bearer access token plus refresh token.
- Idempotency key required for payment, booking, and OTP resend endpoints where applicable.
- Timestamps: ISO 8601 UTC.
- Pagination: cursor-based for lists.

## 2. Common Response Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "cursor": null
  },
  "error": null
}
```

Error response:

```json
{
  "data": null,
  "meta": {
    "requestId": "req_123"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is required",
    "details": {}
  }
}
```

## 3. Authentication and Onboarding

### POST `/auth/consents`
Stores consent before phone entry.

Request:
```json
{
  "role": "student",
  "consentVersion": "2026-06-01",
  "acceptedTerms": true,
  "acceptedPrivacy": true,
  "acceptedCommunications": true,
  "deviceId": "dev_123"
}
```

### POST `/auth/otp/send`
Request OTP.

Request:
```json
{
  "phoneCountryCode": "+91",
  "phoneNumber": "9876543210",
  "role": "student",
  "consentId": "con_123"
}
```

### POST `/auth/otp/verify`
Verify OTP and create or resume user registration.
Clients must keep Verify disabled until all OTP digits are filled. Resend is available after a 60 second timer.

Request:
```json
{
  "phoneCountryCode": "+91",
  "phoneNumber": "9876543210",
  "otp": "123456",
  "deviceId": "dev_123"
}
```

### POST `/auth/mpin`
Set MPIN.
Client validates that MPIN is 4-6 digits and matches confirm MPIN before submitting.

Request:
```json
{
  "mpin": "hashed_or_client_wrapped_value",
  "biometricsEnabled": true
}
```

### POST `/auth/login/mpin`
Login with MPIN.

### POST `/auth/refresh`
Refresh access token.

### POST `/auth/logout`
Logout current device.

## 4. Profile

### GET `/me`
Returns user, roles, profile completion, and app preferences.

### PUT `/profiles/{profileId}`
Updates profile.

Request:
```json
{
  "firstName": "Apoorv",
  "lastName": "Sharma",
  "dob": "2002-04-14",
  "city": "Delhi",
  "communicationAddress": "South Delhi",
  "alternatePhone": "9999999999",
  "avatarAssetId": "ast_123",
  "stream": "senior",
  "specialization": "cbse-class-10-math"
}
```

### POST `/assets/avatar`
Uploads avatar using multipart form data or signed upload URL. The client may source the asset from camera capture or gallery selection after user permission.

### GET `/assets/branding`
Returns app branding assets such as splash and app icon URLs for native/app-shell use.

### GET `/taxonomies/streams`
Returns stream list and specialization metadata.

### GET `/taxonomies/specializations?stream=senior`
Returns specializations for stream.

## 5. Recommendations

### GET `/recommendations/home?role=student`
Returns home carousel content.
The client should show a shimmer loading state until this endpoint resolves.
Recommendation items include `type`: `video`, `article`, or `flashcard`.

Response item:
```json
{
  "id": "rec_123",
  "type": "video",
  "title": "How to prepare for Class 10 algebra",
  "topic": "Mathematics",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "cta": "Watch"
}
```

### GET `/resources/{resourceId}`
Returns resource detail for video, article, flashcard, quiz, or program milestone content.

### POST `/resources/{resourceId}/complete`
Marks a resource complete for the current profile.

### GET `/resources/{resourceId}/flashcards`
Returns 8-10 flashcards with question, answer, and related article reference.

## 6. Tutor Discovery

### GET `/tutors/search`

Query parameters:
- `q`
- `subject`
- `grade`
- `board`
- `city`
- `latitude`
- `longitude`
- `mode`
- `language`
- `gender`
- `minExperienceYears`
- `minRating`
- `maxPrice`
- `availability`
- `sort`
- `cursor`
- `limit`

Response item:
```json
{
  "tutorId": "tut_123",
  "name": "Neha Verma",
  "avatarUrl": "https://cdn.example.com/neha.jpg",
  "rating": 4.8,
  "reviewCount": 126,
  "experienceYears": 7,
  "subjects": ["Mathematics", "Physics"],
  "boards": ["CBSE", "ICSE"],
  "modes": ["online", "home"],
  "languages": ["English", "Hindi"],
  "priceFrom": 700,
  "currency": "INR",
  "matchScore": 94,
  "nextAvailableSlot": "2026-06-24T12:30:00Z"
}
```

### GET `/tutors/{tutorId}`
Returns full tutor profile.

### GET `/tutors/{tutorId}/availability`
Returns available slots by date range.

## 7. Bookings and Calendar

### POST `/bookings/trials`
Creates trial booking.

Request:
```json
{
  "tutorId": "tut_123",
  "studentProfileId": "stu_123",
  "mode": "home",
  "slotStart": "2026-06-25T11:00:00Z",
  "slotEnd": "2026-06-25T12:00:00Z",
  "addressId": "addr_123",
  "subject": "Mathematics",
  "notes": "Focus on algebra basics"
}
```

### GET `/bookings`
Lists bookings for current user.

### POST `/bookings/{bookingId}/accept`
Tutor accepts booking.

### POST `/bookings/{bookingId}/reschedule`
Request reschedule.

### POST `/bookings/{bookingId}/cancel`
Cancel booking.

### POST `/bookings/{bookingId}/complete`
Mark class complete.

### GET `/calendar/events`
Calendar feed for current user.

## 8. Chat

### GET `/chats`
List chat threads.

### POST `/chats`
Create or retrieve thread for tutor/student/booking.

### GET `/chats/{threadId}/messages`
List messages.

### POST `/chats/{threadId}/messages`
Send message.

Request:
```json
{
  "type": "text",
  "body": "Can we focus on calculus in the trial class?"
}
```

### POST `/chats/{threadId}/report`
Report thread.

## 9. Payments

### POST `/payments/intents`
Create payment intent.

Request:
```json
{
  "bookingId": "bok_123",
  "amount": 50000,
  "currency": "INR",
  "purpose": "trial_class"
}
```

### POST `/payments/webhooks/{provider}`
Payment gateway webhook.

### GET `/payments`
Payment history.

### GET `/payments/{paymentId}/receipt`
Receipt.

### GET `/tutor/payouts`
Tutor payout history.

## 10. Reviews

### POST `/reviews`
Create review.

Request:
```json
{
  "bookingId": "bok_123",
  "tutorId": "tut_123",
  "rating": 5,
  "dimensions": {
    "teachingQuality": 5,
    "punctuality": 5,
    "communication": 4,
    "value": 5
  },
  "comment": "Clear explanations and very patient."
}
```

### GET `/tutors/{tutorId}/reviews`
List tutor reviews.

## 11. Dashboards

### GET `/dashboards/student`
Upcoming classes, recommended tutors, recent chats, due payments.

### GET `/dashboards/tutor`
Schedule, leads, earnings, ratings, completion stats.

### GET `/dashboards/parent`
Linked students, upcoming classes, payments, attendance, tutor notes.

## 12. Events and Reminders

### GET `/events`
Lists events/reminders for the current user/profile.

Query parameters:
- `role`
- `profileId`
- `from`
- `to`
- `cursor`
- `limit`

### POST `/events`
Creates an event/reminder.

Request:
```json
{
  "profileId": "stu_123",
  "role": "student",
  "title": "Math revision reminder",
  "startsAt": "2026-06-24T13:00:00Z",
  "type": "reminder",
  "source": "manual"
}
```

### PATCH `/events/{eventId}`
Updates title, time, status, or notification preferences.

### DELETE `/events/{eventId}`
Deletes a manual reminder/event.

### POST `/events/{eventId}/complete`
Marks reminder as completed.

## 13. Sessions and Programs

### GET `/programs?role=student`
Returns role-customized programs such as the 12 month NEET program.

### GET `/programs/{programId}/milestones`
Returns ordered milestones with locked/unlocked state.

### POST `/programs/{programId}/milestones/{milestoneId}/complete`
Completes a milestone and unlocks the next one.

## 14. AI Matching

### POST `/ai/matches`
Returns ranked tutor matches.

Request:
```json
{
  "studentProfileId": "stu_123",
  "subject": "Mathematics",
  "grade": "10",
  "board": "CBSE",
  "mode": "home",
  "city": "Delhi",
  "budgetMax": 900,
  "languages": ["English", "Hindi"],
  "preferredGender": "any"
}
```

Response:
```json
{
  "matches": [
    {
      "tutorId": "tut_123",
      "score": 94,
      "reasons": [
        "Teaches CBSE Class 10 Mathematics",
        "Available weekday evenings",
        "Within preferred budget"
      ]
    }
  ]
}
```

## 15. Admin APIs

- `GET /admin/tutors/pending-verification`
- `POST /admin/tutors/{tutorId}/verify`
- `POST /admin/content/recommendations`
- `GET /admin/disputes`
- `POST /admin/disputes/{disputeId}/resolve`
- `GET /admin/audit-logs`

## 16. Security Requirements

- Rate limit OTP and login attempts.
- Store only hashed MPIN values.
- Never expose raw OTP.
- Payment webhook signature verification.
- Role-based authorization for every endpoint.
- Audit sensitive profile, booking, and payment changes.
