# myTution PRD Specification

## 1. Product Summary

myTution is a mobile-first marketplace for home tutors, online tutors, students, and parents. It supports tutor discovery, trusted profiles, trial booking, scheduling, chat, payments, dashboards, reviews, and AI-assisted tutor matching.

## 2. Goals

- Help students and parents find suitable tutors by subject, grade, board, location, teaching mode, language, gender, experience, rating, and availability.
- Help tutors create credible profiles, receive qualified leads, manage trial classes, schedules, payments, and student relationships.
- Reduce friction in registration through phone OTP, consent capture, MPIN, biometrics, and guided profile setup.
- Provide personalized learning/tutor recommendations based on role, subject specialization, stream, city, behavior, and previous bookings.

## 3. Personas

### Student
- Wants trustworthy tutors for a specific subject, board, grade, language, and mode.
- Needs trial classes, scheduling flexibility, transparent pricing, reviews, and safe communication.

### Parent
- Wants visibility into child progress, payments, tutor credentials, class schedule, attendance, and reviews.
- Needs control, reminders, and safety assurance.

### Tutor
- Wants high-quality leads, clear student requirements, schedule management, payments, ratings, and growth insights.
- Needs profile credibility, specialization tagging, and tools to manage trial and paid classes.

### Admin/Ops
- Verifies tutors, resolves disputes, monitors payments, manages content, handles moderation, and audits fraud.

## 4. In Scope

- Role-based registration for Tutor, Student, and Parent.
- myTution splash and app icon assets embedded in the prototype and referenced in launch documentation.
- Consent capture before phone number entry.
- OTP login/registration.
- MPIN setup and optional biometric enablement.
- Profile setup: first name, last name, DOB, city, communication address, alternate phone, avatar.
- Avatar capture/update from profile setup using camera or gallery permissions.
- Specialization setup with dependent dropdowns:
  - Stream: Junior, Senior, UG, PG.
  - Specialization: populated from stream.
- Role-specific value proposition screen.
- Value propositions appear as 3 sequential screens, one prop per screen, with illustration, title, description, Skip on screens 1-2, Next on screens 1-2, and Get started on screen 3.
- Home screen with greeting, profile context, recommendation carousel, discovery entry points, upcoming sessions, and dashboard cards.
- Home screen event/reminder creation with upcoming reminder preview.
- Role-specific resource cards for video, article, and flashcards.
- Tutor search and discovery.
- Tutor profile.
- Trial class booking.
- Calendar and scheduling.
- In-app chat.
- Payments.
- Reviews and ratings.
- Parent dashboard.
- Tutor dashboard.
- AI tutor matching.

## 5. Out of Scope for MVP

- Full LMS with assignments, tests, and recorded classes.
- Live whiteboard/classroom engine.
- Tutor background verification API integrations beyond manual/admin workflow.
- Multi-country localization.
- Corporate/institute accounts.

## 6. User Journeys

### 6.1 Registration

1. User opens app.
2. User selects role: Student, Tutor, or Parent.
3. App shows 2-3 value propositions based on selected role.
4. User reads and accepts consent terms.
5. User enters phone number.
6. App sends OTP.
7. User verifies OTP.
8. User sets 4 or 6 digit MPIN.
9. User optionally enables biometrics.
10. User completes profile details.
11. User selects stream and specialization.
12. User lands on role-specific home screen.

### 6.2 Student/Tutor Discovery

1. Student opens discovery.
2. Student searches by subject or class/grade.
3. Student applies filters: board, location, online/home tuition, language, gender, experience, rating, price, availability.
4. App displays tutor cards with match score, rating, mode, pricing, distance/online availability, and trial availability.
5. Student opens tutor profile.
6. Student books trial or starts chat.

### 6.3 Trial Class Booking

1. Student selects tutor.
2. Student chooses trial class type: online or home tuition.
3. Student selects date/time from tutor availability.
4. Student confirms address or online preference.
5. Student completes free/paid trial payment if applicable.
6. Confirmation appears in calendar for student, parent, and tutor.

### 6.4 Tutor Dashboard

1. Tutor sees today’s schedule, pending trial requests, earnings, profile completion, ratings, and student leads.
2. Tutor accepts/reschedules/cancels trial requests.
3. Tutor chats with students/parents.
4. Tutor tracks payments and reviews.

### 6.5 Parent Dashboard

1. Parent sees linked student profiles.
2. Parent views upcoming classes, attendance, payment history, tutor details, reviews, and progress notes.
3. Parent approves bookings or payments where required.

## 7. Functional Requirements

### Authentication
- Phone number with OTP.
- OTP resend with cooldown.
- OTP resend timer starts at 60 seconds and appears as hyperlink-style resend text after cooldown.
- Verify OTP CTA remains disabled until all OTP digits are filled.
- MPIN setup and verification.
- MPIN setup includes show/hide eye controls, disabled Continue until MPIN is entered, and validation that MPIN and confirm MPIN match.
- Optional biometrics using OS-level biometric APIs.
- Session expiry and device binding.

### Consent
- Consent checkbox must be accepted before phone number entry.
- Consent version, timestamp, IP/device metadata, and user ID must be stored.
- Terms, privacy policy, and communication consent should be separately versioned.

### Profile
- Required: first name, last name, DOB, city, address, avatar.
- Avatar edit is triggered from the avatar itself using a pencil affordance and supports camera capture or gallery upload.
- Optional: alternate phone number.
- Tutor-only: qualification, experience, subjects, teaching mode, hourly/monthly fee, languages, gender, availability, verification documents.
- Student-only: grade/class, board, stream, subjects, preferred language, learning goals.
- Parent-only: linked students, relationship, payment owner flag.
- Parent profile setup does not show stream and specialization fields.
- Profile setup screen should not allow back navigation after MPIN setup.

### Discovery
- Search by subject, grade, board, location.
- Filters: online/home tuition, language, gender, experience, rating, price, availability, distance.
- Sort: relevance, rating, price low-high, experience, nearest, earliest availability.
- Tutor cards must show enough trust signals before opening profile.

### Tutor Profile
- Avatar, name, rating, verified badges, subjects, stream, board support, experience, languages, pricing, teaching mode, availability, reviews, intro video/article links, and booking CTA.

### Calendar
- Tutor creates weekly availability.
- Student books available slots.
- Both parties can request reschedule.
- Notifications for upcoming sessions, cancellations, and payment events.

### Events and Reminders
- Any role can create personal events/reminders from Home.
- Reminder fields: title, date, time, owner role/profile, and status.
- Home shows a maximum of 2 upcoming reminders.
- “View more” opens the full events/reminders screen.
- Reminders can be used for class prep, payment follow-up, lead response, parent approval, or study tasks.
- Create reminder section hides after at least one reminder exists.
- Users can edit and delete reminders.
- If all reminders are deleted, the create reminder section appears again.

### Learning Resources
- Video cards show a thumbnail and open a video player screen with title, description, Mark complete, and return-to-home behavior.
- Article cards open a banner-based article screen with title, description, Mark complete, and return-to-home behavior.
- Flashcard cards open a landing screen with Start flashcard.
- Flashcard play supports 8-10 cards, tap-to-flip answer, Learn more to related article, Mark complete, and return-to-home behavior.

### Sessions and Programs
- Sessions tab shows a role-customized program.
- Student example: 12 month NEET program.
- Milestones unlock only after the previous milestone is completed/opened.
- Each milestone contains video, article, flashcard, and quiz activities.
- Sessions also show the same events/reminders data available from the events/reminders screen.

### Payments and Ratings Navigation
- Bottom menu includes Payments.
- Dashboard metric tiles route to their respective screens, e.g. payment tile to payment methods, ratings tile to ratings/reviews, session tile to sessions, chat tile to chat.

### Recommendations Loading
- Home recommendation carousel should not appear before content is ready.
- A role-themed shimmer loader appears while smart picks are loading.
- Loader disappears once carousel content is available.

### Chat
- Chat is enabled after profile interest, booking request, or admin-approved lead.
- Supports text, attachments, system booking messages, and moderation reporting.
- Phone number masking is recommended before booking confirmation.

### Payments
- Support UPI/cards/net banking/wallets through payment gateway.
- Payment states: initiated, pending, paid, failed, refunded, disputed.
- Platform commission and tutor payout ledger.
- Invoice/receipt generation.

### Reviews
- Student/parent can review after completed class.
- Rating dimensions: teaching quality, punctuality, communication, value.
- Tutor can respond once.
- Moderation support.

### AI Matching
- Match score based on subject, grade, board, mode, location, language, budget, availability, rating, experience, and prior behavior.
- Explainable match reasons should be shown, e.g. “Matches CBSE Class 10 Math, Hindi/English, available evenings.”

## 8. Content Requirements

### Student Value Props
- Find verified tutors for home or online classes.
- Book trial classes with transparent pricing.
- Get personalized tutor recommendations.

### Tutor Value Props
- Receive qualified student leads.
- Manage classes, calendar, chat, and payments in one app.
- Build credibility through ratings and verified profile.

### Parent Value Props
- Track classes, payments, tutor details, and reviews.
- Approve trial classes and monitor progress.
- Safer communication and transparent scheduling.

### Role Personas for Prototype
- Tutor: Ankit Sharma.
- Student: Apoorv Gulati.
- Parent: Sarmishtha Gulati.

## 9. Non-Functional Requirements

- Mobile-first, Android and iOS.
- OTP response under 10 seconds in normal network conditions.
- Search response under 1.5 seconds for common filters.
- 99.5% monthly uptime for MVP, 99.9% target after scale.
- Encrypt sensitive data in transit and at rest.
- Audit logs for auth, payments, profile edits, tutor verification, admin actions.
- Accessibility: readable contrast, dynamic text support, screen reader labels.

## 10. Metrics

- Registration conversion rate.
- Profile completion rate.
- Search-to-profile-view rate.
- Profile-view-to-trial-booking rate.
- Trial-to-paid-conversion rate.
- Tutor response time.
- Class completion rate.
- Payment success rate.
- Review submission rate.
- Retention: D1, D7, D30.

## 11. MVP Release Plan

### MVP 1
- Role-based onboarding, OTP, MPIN, profile setup.
- Tutor discovery and profile.
- Trial booking, basic calendar, chat, payment initiation.
- Student/tutor dashboards.

### MVP 2
- Parent dashboard.
- Reviews.
- Tutor verification workflow.
- Recommendation carousel and content management.

### MVP 3
- AI matching.
- Advanced analytics.
- Payout automation.
- Dispute management and moderation tools.

## 12. Open Decisions

- Is Parent a separate registration role at launch or linked later from Student?
- Will trial classes be free, paid, or tutor-configurable?
- Are tutors manually verified before appearing in search?
- Will myTution hold funds in escrow until class completion?
- Which payment gateway and OTP provider will be used?
