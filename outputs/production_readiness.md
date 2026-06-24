# myTution Production Readiness Checklist

## 1. Additional Documents Recommended

- `architecture_spec.md`: system architecture, services, environments, deployment topology.
- `security_privacy_spec.md`: threat model, auth controls, PII handling, consent, encryption, audit logs.
- `analytics_spec.md`: event taxonomy, funnels, dashboards, experimentation plan.
- `qa_test_plan.md`: manual and automated test plan across onboarding, booking, payments, chat, and dashboards.
- `ops_admin_spec.md`: admin panel requirements for tutor verification, content, disputes, refunds, moderation.
- `notification_spec.md`: push/SMS/email/WhatsApp templates, triggers, opt-in/out rules.
- `payments_settlement_spec.md`: commission, refund, dispute, payout, invoice, tax handling.
- `ai_matching_spec.md`: matching features, ranking, explainability, evaluation, safety, fallback logic.
- `legal_content_pack.md`: terms, privacy policy, tutor agreement, payment/refund policy, consent copy.

## 2. Suggested Technical Architecture

- Mobile app: Flutter or React Native.
- Backend: Node.js/NestJS, Java/Spring Boot, or Python/FastAPI.
- Database: PostgreSQL.
- Cache/rate limits: Redis.
- Search: OpenSearch, Typesense, or Meilisearch.
- File storage: S3-compatible object storage.
- Notifications: FCM/APNs plus SMS provider.
- Payments: Razorpay, Cashfree, PhonePe PG, or Stripe if supported for target market.
- Analytics: Segment/RudderStack plus warehouse.
- Monitoring: Sentry, OpenTelemetry, Prometheus/Grafana, cloud logs.

## 3. MVP Build Milestones

### Milestone 1: Foundations
- Design system.
- Authentication and registration.
- Role-based profile setup.
- Core database schema.
- Admin skeleton.

### Milestone 2: Marketplace Core
- Tutor onboarding.
- Tutor search and filters.
- Tutor profile.
- Trial booking.
- Calendar.

### Milestone 3: Transactions
- Chat.
- Payment intent and webhook flow.
- Receipts.
- Tutor ledger.
- Reviews.

### Milestone 4: Dashboards and Trust
- Parent dashboard.
- Tutor dashboard.
- Tutor verification.
- Notifications.
- Moderation/reporting.

### Milestone 5: Intelligence and Scale
- AI matching.
- Recommendations.
- Search tuning.
- Analytics and conversion optimization.

## 4. Launch Risks

- Tutor supply quality and verification turnaround.
- OTP/payment provider reliability.
- Search relevance for local home tuition.
- Unsafe off-platform contact if phone masking is weak.
- Refund and cancellation disputes.
- Low profile completion if onboarding is too long.

## 5. Production Gates

- OTP and payment rate limits tested.
- Consent and privacy flows legally reviewed.
- Payment webhooks verified with signature checks.
- Tutor discovery p95 latency below target.
- Backup and restore tested.
- Crash-free sessions above 99%.
- Admin can suspend users, hide reviews, resolve disputes, and refund payments.
- App store privacy labels and permissions reviewed.
