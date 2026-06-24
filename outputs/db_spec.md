# myTution Database Specification

## 1. Database Choice

Recommended production stack:
- PostgreSQL for transactional data.
- Redis for OTP/session/rate-limit/cache.
- Object storage for avatars, documents, and attachments.
- Search index such as OpenSearch/Meilisearch/Typesense for tutor discovery at scale.
- Analytics warehouse later for reporting and matching optimization.

## 2. Core Entities

### users
Stores account-level identity.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| phone_country_code | text | e.g. +91 |
| phone_number | text | unique with country code |
| status | text | pending, active, suspended, deleted |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### user_roles
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | |
| role | text | student, tutor, parent, admin |
| is_primary | boolean | |

### consents
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid nullable fk users | nullable before OTP |
| role | text | selected role |
| consent_version | text | |
| accepted_terms | boolean | |
| accepted_privacy | boolean | |
| accepted_communications | boolean | |
| device_id | text | |
| ip_address | inet | |
| accepted_at | timestamptz | |

### auth_credentials
| Column | Type | Notes |
|---|---|---|
| user_id | uuid pk fk users | |
| mpin_hash | text | never store raw MPIN |
| biometrics_enabled | boolean | |
| failed_attempt_count | int | |
| locked_until | timestamptz nullable | |

### devices
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | |
| device_fingerprint | text | |
| push_token | text nullable | |
| platform | text | ios, android |
| last_seen_at | timestamptz | |

## 3. Profiles

### profiles
Common profile fields.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | |
| role | text | student, tutor, parent |
| first_name | text | |
| last_name | text | |
| dob | date | |
| city | text | indexed |
| communication_address | text | |
| alternate_phone | text nullable | |
| avatar_asset_id | uuid nullable | |
| stream | text nullable | junior, senior, ug, pg |
| specialization_id | uuid nullable | |
| completion_percent | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tutor_profiles
| Column | Type | Notes |
|---|---|---|
| profile_id | uuid pk fk profiles | |
| headline | text | |
| bio | text | |
| gender | text nullable | |
| experience_years | int | |
| qualification | text | |
| verification_status | text | pending, verified, rejected |
| base_price_amount | int | minor units |
| currency | text | INR |
| trial_price_amount | int nullable | |
| home_tuition_enabled | boolean | |
| online_enabled | boolean | |
| average_rating | numeric(3,2) | cached |
| review_count | int | cached |

### student_profiles
| Column | Type | Notes |
|---|---|---|
| profile_id | uuid pk fk profiles | |
| grade | text | 1-12, UG, PG |
| board | text nullable | CBSE, ICSE, State, IB, IGCSE |
| learning_goals | text nullable | |
| preferred_mode | text nullable | online, home, both |
| preferred_language | text nullable | |

### parent_student_links
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| parent_profile_id | uuid fk profiles | |
| student_profile_id | uuid fk profiles | |
| relationship | text | mother, father, guardian |
| can_approve_bookings | boolean | |
| can_pay | boolean | |

## 4. Taxonomy

### streams
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| code | text unique | junior, senior, ug, pg |
| name | text | |

### specializations
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| stream_id | uuid fk streams | |
| name | text | |
| subject | text | |
| grade_or_level | text | |
| board | text nullable | |

### tutor_specializations
| Column | Type | Notes |
|---|---|---|
| tutor_profile_id | uuid fk profiles | |
| specialization_id | uuid fk specializations | |
| primary key | composite | |

### tutor_languages
| Column | Type | Notes |
|---|---|---|
| tutor_profile_id | uuid fk profiles | |
| language | text | |

## 5. Discovery and Availability

### tutor_service_areas
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| city | text | |
| locality | text | |
| latitude | numeric nullable | |
| longitude | numeric nullable | |
| radius_km | numeric | |

### tutor_availability_rules
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| day_of_week | int | 0-6 |
| start_time | time | |
| end_time | time | |
| mode | text | online, home, both |
| is_active | boolean | |

### tutor_availability_exceptions
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| reason | text nullable | |

## 6. Events and Reminders

### events
Stores role-owned reminders and manually created calendar events.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | owner |
| profile_id | uuid fk profiles | role profile |
| role | text | student, tutor, parent |
| title | text | |
| type | text | reminder, class_prep, payment, lead_follow_up, parent_approval |
| source | text | manual, booking, payment, system |
| starts_at | timestamptz | |
| ends_at | timestamptz nullable | |
| status | text | active, completed, dismissed, cancelled |
| notification_enabled | boolean | |
| metadata | jsonb | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Reminder records should support edit/delete flows. Deletion can be hard delete for local prototype behavior or soft delete with `status = cancelled` in production.

## 7. Bookings

### bookings
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| student_profile_id | uuid fk profiles | |
| parent_profile_id | uuid nullable fk profiles | |
| type | text | trial, regular |
| subject | text | |
| mode | text | online, home |
| status | text | requested, accepted, paid, confirmed, completed, cancelled, reschedule_requested |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| address_id | uuid nullable | |
| meeting_url | text nullable | |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### booking_events
Audit trail for booking state changes.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| actor_user_id | uuid fk users | |
| event_type | text | |
| old_status | text nullable | |
| new_status | text nullable | |
| metadata | jsonb | |
| created_at | timestamptz | |

## 8. Chat

### chat_threads
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| booking_id | uuid nullable fk bookings | |
| created_at | timestamptz | |

### chat_participants
| Column | Type | Notes |
|---|---|---|
| thread_id | uuid fk chat_threads | |
| user_id | uuid fk users | |
| role | text | |
| last_read_message_id | uuid nullable | |

### chat_messages
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| thread_id | uuid fk chat_threads | |
| sender_user_id | uuid fk users | |
| type | text | text, attachment, system |
| body | text nullable | |
| asset_id | uuid nullable | |
| status | text | sent, delivered, read, deleted |
| created_at | timestamptz | |

## 9. Payments and Payouts

### payments
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| payer_user_id | uuid fk users | |
| amount | int | minor units |
| currency | text | INR |
| provider | text | |
| provider_payment_id | text nullable | |
| status | text | initiated, pending, paid, failed, refunded, disputed |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tutor_ledger_entries
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| payment_id | uuid nullable fk payments | |
| entry_type | text | earning, commission, payout, refund |
| amount | int | signed minor units |
| currency | text | |
| created_at | timestamptz | |

### payouts
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| tutor_profile_id | uuid fk profiles | |
| amount | int | |
| currency | text | |
| status | text | pending, processing, paid, failed |
| provider_reference | text nullable | |
| created_at | timestamptz | |

## 10. Reviews

### reviews
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| tutor_profile_id | uuid fk profiles | |
| reviewer_profile_id | uuid fk profiles | student or parent |
| rating | int | 1-5 |
| dimensions | jsonb | |
| comment | text nullable | |
| status | text | published, hidden, reported |
| created_at | timestamptz | |

## 11. Content and Recommendations

### content_items
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| type | text | video, article, flash_card, tutor_spotlight |
| title | text | |
| body | text nullable | |
| media_asset_id | uuid nullable | |
| topic | text | |
| stream | text nullable | |
| specialization_id | uuid nullable | |
| status | text | draft, published, archived |
| created_at | timestamptz | |

### branding_assets
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| asset_type | text | app_icon, splash |
| asset_id | uuid | object storage reference |
| platform | text nullable | ios, android, web |
| status | text | active, archived |
| created_at | timestamptz | |

### flashcards
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| content_item_id | uuid fk content_items | flashcard deck |
| sequence | int | 1-10 |
| question | text | |
| answer | text | |
| related_article_id | uuid nullable fk content_items | |

### resource_progress
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| profile_id | uuid fk profiles | |
| content_item_id | uuid fk content_items | |
| status | text | started, completed |
| completed_at | timestamptz nullable | |

### recommendation_impressions
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | |
| content_item_id | uuid fk content_items | |
| surface | text | home |
| action | text | viewed, clicked, dismissed |
| created_at | timestamptz | |

### programs
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| role | text | student, tutor, parent |
| title | text | e.g. 12 month NEET program |
| description | text | |
| status | text | active, archived |

### program_milestones
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| program_id | uuid fk programs | |
| sequence | int | unlock order |
| title | text | |
| video_content_id | uuid nullable fk content_items | |
| article_content_id | uuid nullable fk content_items | |
| flashcard_content_id | uuid nullable fk content_items | |
| quiz_content_id | uuid nullable fk content_items | |

### profile_program_progress
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| profile_id | uuid fk profiles | |
| program_id | uuid fk programs | |
| unlocked_milestone_sequence | int | |
| completed_milestone_sequence | int | |

## 12. AI Matching

### match_requests
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| requester_user_id | uuid fk users | |
| student_profile_id | uuid fk profiles | |
| criteria | jsonb | |
| created_at | timestamptz | |

### match_results
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| match_request_id | uuid fk match_requests | |
| tutor_profile_id | uuid fk profiles | |
| score | numeric(5,2) | |
| reasons | jsonb | |

## 13. Indexes

- `users(phone_country_code, phone_number)` unique.
- `profiles(user_id, role)`.
- `profiles(city)`.
- `specializations(stream_id, subject, grade_or_level, board)`.
- `tutor_profiles(verification_status, average_rating, experience_years)`.
- `bookings(tutor_profile_id, starts_at)`.
- `bookings(student_profile_id, starts_at)`.
- `payments(booking_id, status)`.
- `reviews(tutor_profile_id, status, created_at)`.
- `events(profile_id, starts_at, status)`.
- `events(user_id, starts_at)`.
- `resource_progress(profile_id, content_item_id)`.
- `program_milestones(program_id, sequence)`.
- Search index for tutors containing subjects, boards, grades, city, locality, mode, languages, gender, price, rating, availability summary.

## 14. Data Privacy and Retention

- Encrypt phone numbers and addresses where supported.
- Restrict address visibility until booking confirmation.
- Retain payment/audit records according to local compliance needs.
- Support account deletion with anonymization where legally allowed.
- Separate public tutor profile data from private verification data.
- Avatar assets sourced from camera/gallery should be user-replaceable and removable.
