# myTution Design Specification

## 1. Design Principles

- Trust first: tutor identity, ratings, verification, pricing, and availability must be easy to scan.
- Fast decisions: students and parents should quickly narrow options through search and filters.
- Calm operations: tutor and parent dashboards should feel organized, not promotional.
- Role-aware: every screen should adapt to Tutor, Student, or Parent context.
- Mobile-first: all primary journeys should work comfortably on a 360px wide Android screen.

## 2. Visual Direction

- Brand personality: credible, warm, modern, education-focused.
- Suggested palette:
  - Primary: Deep teal `#066B6B`
  - Accent: Sun `#F6B73C`
  - Success: `#23885E`
  - Warning: `#B7791F`
  - Error: `#C53030`
  - Ink: `#1F2933`
  - Muted text: `#64748B`
  - Surface: `#FFFFFF`
  - App background: `#F5F7FA`
- Role accent palettes:
  - Tutor: Accent 3 Lemon range, from `#FEFEF7` through `#F3F2AA`.
  - Student: Accent 4 Lavender range, from `#FDFBFE` through `#EDD4F7`.
  - Parent: Accent 5 Aqua range, from `#F7FCFD` through `#CCEFF4`.
- Primary and secondary buttons must inherit the active role theme instead of using a fixed green treatment.
- App icon asset: `outputs/assets/myTution_icon.png`.
- Splash asset: `outputs/assets/myTution_splash.png`.
- Avoid overly playful visuals in transactional flows such as payment, booking, and verification.

## 3. Typography

- Use platform system fonts:
  - iOS: San Francisco.
  - Android: Roboto.
- Type scale:
  - Screen title: 24/30 semibold.
  - Section title: 18/24 semibold.
  - Card title: 16/22 semibold.
  - Body: 14/20 regular.
  - Caption: 12/16 regular.
- Letter spacing: 0.

## 4. Navigation Model

### Student Bottom Tabs
- Home
- Sessions
- Pay
- Chat
- Account

### Tutor Bottom Tabs
- Home
- Leads
- Calendar
- Chat
- Account

### Parent Bottom Tabs
- Home
- Children
- Payments
- Chat
- Account

Bottom navigation should use a floating dark pill container with rounded edges, shadow, role-accent icons/text, and active item contrast. All bottom navigation icons should use identical 24px sizing and active/inactive icon color should follow the current role theme.

## 5. Core Screens

### 5.1 Role Selection
- Full-screen onboarding.
- Role cards: Student, Tutor, Parent.
- Each role card includes icon, short label, and one-line explanation.
- Primary CTA: Continue.

### 5.2 Role Value Props
- Shows one value proposition per screen.
- Each value prop screen has an illustration, title, and description.
- Screens 1-2 show Skip in the top right and Next at the bottom.
- Final screen shows Get started and no Skip.
- Change Role button is not shown in this flow.

### 5.3 Consent and Phone Entry
- Consent text with links to Terms, Privacy Policy, and Communication Policy.
- Checkbox must be selected before phone field is enabled.
- Phone input uses country code and numeric keyboard.
- CTA: Send OTP.

### 5.4 OTP Verification
- 6 digit OTP input.
- 60 second live timer and hyperlink-style resend CTA.
- Verify OTP button disabled until all digits are filled.
- Edit phone CTA.

### 5.5 MPIN and Biometrics
- MPIN creation.
- Confirm MPIN.
- Eye icon to show/hide MPIN fields.
- Continue button disabled until MPIN is present and confirm MPIN matches.
- Optional biometric enablement.
- Clear fallback copy: MPIN can always be used.

### 5.6 Profile Setup
- Centered avatar at 1.5x normal size.
- Avatar edit uses a pencil icon over the avatar.
- Pencil action exposes camera and gallery options and invokes native file/camera permissions.
- First name, last name, DOB, city, communication address, alternate phone.
- Stream dropdown: Junior, Senior, UG, PG.
- Specialization dropdown depends on selected stream.
- Parent role hides stream and specialization.
- Profile setup does not show a back button.
- Progress indicator across profile steps.

### 5.7 Home
- Header:
  - Time-based greeting: Good Morning/Afternoon/Evening.
  - First name.
  - Notification icon.
- Personalized recommendation carousel:
  - 5 horizontal cards.
  - Content types: video, article, flash card, practice tip, tutor spotlight.
  - Hidden by default while content loads.
  - Role-themed shimmer loader appears for a short loading state, then disappears.
- Event/reminder creation:
  - Title, date, and time fields.
  - Create reminder CTA.
  - Upcoming reminders card shows maximum 2 items.
  - View more opens the events/reminders screen.
  - Create reminder form hides after at least one reminder exists.
  - Reminder cards support edit and delete.
- Discovery/search entry.
- Upcoming class card.
- Role-specific dashboard summary.

### 5.8 Tutor Discovery
- Search bar with subject-first placeholder.
- Filter chips:
  - Class/grade
  - Board
  - Location
  - Online/Home
  - Language
  - Gender
  - Experience
  - Rating
  - Price
- Tutor result card:
  - Avatar
  - Name
  - Rating
  - Subject and board tags
  - Experience
  - Mode
  - Price
  - Match score
  - Trial availability CTA

### 5.9 Tutor Profile
- Hero summary with avatar, name, verified badge, rating, experience.
- Subjects and supported grades.
- Teaching modes and languages.
- Availability preview.
- Pricing.
- Reviews.
- CTA bar: Chat, Book Trial.

### 5.10 Trial Booking
- Step 1: Select mode.
- Step 2: Select date/time.
- Step 3: Confirm student/address.
- Step 4: Payment if required.
- Confirmation screen with calendar entry.

### 5.11 Calendar
- Weekly calendar view.
- Agenda list.
- State colors:
  - Confirmed
  - Pending
  - Reschedule requested
  - Cancelled
  - Completed

### 5.12 Chat
- Conversation list.
- Chat detail with booking context pinned at top.
- Message states: sent, delivered, read.
- Report/block menu.

### 5.13 Payments
- Student/parent: due payments, payment history, receipts.
- Tutor: earnings, pending payouts, completed payouts, commission.

### 5.14 Dashboards
- Parent:
  - Linked students.
  - Upcoming classes.
  - Attendance.
  - Payment status.
  - Tutor notes.
- Tutor:
  - Today’s schedule.
  - Leads.
  - Earnings.
  - Rating.
  - Profile completion.

### 5.15 Learning Resource Screens
- Video resource: thumbnail card opens a video-player-style screen with title, description, Mark complete.
- Article resource: banner replaces video player and uses the same title/description/Mark complete structure.
- Flashcard resource: landing screen, Start flashcard, 8-10 cards, tap-to-flip answer, Learn more to article, Mark complete.

### 5.16 Sessions Program
- Sessions tab shows a role-customized learning/operational program.
- Student example: 12 month NEET program.
- Milestones are locked until prior milestone is completed.
- Each milestone exposes video, article, flashcard, and quiz actions.
- Events/reminders are repeated in Sessions for schedule continuity.

## 6. Component Inventory

- RoleCard
- ValuePropList
- ConsentCheckbox
- PhoneInput
- OTPInput
- MPINInput
- BiometricToggle
- ProfileForm
- DependentDropdown
- GreetingHeader
- RecommendationCarousel
- SearchFilterSheet
- TutorCard
- TutorProfileSummary
- AvailabilityPicker
- BookingConfirmation
- ChatThread
- PaymentSummaryCard
- ReviewCard
- DashboardMetric
- FloatingBottomNav
- AvatarEditor
- ShimmerLoader
- EventReminderForm
- EventReminderCard
- ResourceCard
- ResourceDetail
- FlashcardPlayer
- ProgramMilestoneCard
- PaymentMethodCard
- RatingReviewCard

## 7. Empty, Loading, and Error States

- Search empty state: suggest broadening filters.
- Calendar empty state: suggest adding availability or booking a trial.
- Payment failure: show retry and support contact.
- Chat unavailable: explain when chat unlocks.
- OTP failure: show remaining attempts and resend timer.

## 8. Accessibility

- Minimum touch target: 44x44 px.
- All icons need accessible labels.
- Support dynamic font scaling.
- Maintain 4.5:1 contrast for text.
- Do not rely on color alone for booking/payment status.

## 9. Prototype Notes

The included HTML prototype demonstrates information architecture and interaction flow, not final visual assets. Production implementation should be built as native or cross-platform mobile code using this design system.
