export type Role = "student" | "tutor" | "parent";

export type Stream = "junior" | "senior" | "ug" | "pg";

export type ResourceType = "video" | "article" | "flashcard" | "quiz";

export type ConsentDocumentType = "pdf" | "url";

export interface ConsentDocumentSummary {
  id: string;
  key: string;
  version: string;
  title: string;
  description: string;
  documentType: ConsentDocumentType;
  documentUrl: string;
  accessLevel: "public" | "private";
  roleScope: Role | null;
  required: boolean;
  status: string;
  permissionSet?: Record<string, unknown>;
}

export interface ConsentRequirementResponse {
  service: "access-control";
  module: "consent-management";
  required: ConsentDocumentSummary[];
}

export type FeatureFlagKey =
  | "aiMatching"
  | "avatarUpload"
  | "biometrics"
  | "chat"
  | "eventsReminders"
  | "flashcards"
  | "payments"
  | "programSessions"
  | "recommendations"
  | "reviews"
  | "tutorDiscovery";

export interface Persona {
  role: Role;
  firstName: string;
  lastName: string;
  initials: string;
  phone: string;
  profileLabel: string;
}

export interface IdentityLinkedProfile {
  id: string;
  relationship: string;
  status: string;
  profileId: string;
  userId?: string;
  phone?: string;
  name: string;
}

export interface IdentityTutorProfile {
  id: string;
  headline: string;
  subjects: string[];
  boards: string[];
  grades: string[];
  languages: string[];
  mode: string[];
  experienceYears: number;
  rating: number;
  hourlyRate: number;
  gender: string;
  location: string;
  bio: string;
  verificationStatus?: string;
  profileStatus?: string;
  outreachEnabled?: boolean;
  outreachPlan?: string | null;
}

export interface CurriculumSelection {
  board: string;
  classLevel: string;
  subject: string;
  stage?: string | null;
  stream?: string | null;
}

export interface CurriculumClassOption {
  id: string;
  label: string;
  stage: string;
  subjects: string[];
}

export interface CurriculumBoardOption {
  id: string;
  label: string;
  fullName?: string | null;
  classes: CurriculumClassOption[];
}

export interface CurriculumCatalogueResponse {
  boards: CurriculumBoardOption[];
  classes: CurriculumClassOption[];
  subjects: string[];
}

export interface IdentityProfile {
  id: string;
  userId: string;
  role: Role;
  firstName: string;
  lastName: string;
  initials: string;
  dob: string | null;
  city: string | null;
  communicationAddress: string | null;
  alternatePhone: string | null;
  avatarUrl: string | null;
  stream: string | null;
  specialization: string | null;
  curriculumSelections?: CurriculumSelection[];
  sourceTag: string;
  profileCompletion: number;
  tutorProfile: IdentityTutorProfile | null;
  linkedParents: IdentityLinkedProfile[];
  linkedStudents: IdentityLinkedProfile[];
  createdAt: string;
  updatedAt: string;
}

export interface IdentityContext {
  user: {
    id: string;
    phone: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  activeProfile: IdentityProfile | null;
  profiles: IdentityProfile[];
  permissions: string[];
}

export interface Recommendation {
  id: string;
  role: Role;
  type: ResourceType;
  title: string;
  description: string;
  thumbnailLabel: string;
  assetUrls?: ResourceAssetUrls;
}

export interface ResourceAssetUrls {
  thumbnail?: string | null;
  banner?: string | null;
  vtt?: string | null;
  metadata?: string | null;
  media?: string | null;
}

export interface ResourceAssetMetadata {
  provider: string;
  accessLevel: string;
  version: string;
  storageType: string;
  assetSlug?: string | null;
  entitled: boolean;
  readonly: boolean;
  urls: ResourceAssetUrls;
}

export interface Reminder {
  id: string;
  role: Role;
  title: string;
  startsAt: string;
  status: "active" | "completed" | "cancelled";
  sourceTag?: string;
}

export interface ProgramMilestone {
  id: string;
  sequence: number;
  title: string;
  locked: boolean;
  resources: ResourceType[];
  activities?: Array<{
    id: string;
    resourceId: string;
    sequence: number;
    type: ResourceType;
    title: string;
    description: string;
    assetUrls?: ResourceAssetUrls;
    status: "pending" | "in_progress" | "complete";
  }>;
}

export interface QuizAttemptSummary {
  id: string;
  resourceId: string;
  score: number;
  total: number;
  percent: number;
  answers: number[];
  createdAt: string;
}

export interface NotificationSummary {
  id: string;
  role: Role;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: string;
  provider: string;
  status: string;
  priority: string;
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DeviceRegistrationSummary {
  id: string;
  role: Role;
  platform: string;
  provider: string;
  status: string;
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerProgressProgramSummary {
  programId: string;
  title: string;
  totalActivities: number;
  completedActivities: number;
  percent: number;
  completedMilestoneSequence: number;
  unlockedMilestoneSequence: number;
  latestQuizPercent?: number | null;
  lastActivityAt?: string | null;
}

export interface LearnerProgressSummary {
  profileId: string;
  name: string;
  city: string | null;
  programs: LearnerProgressProgramSummary[];
}

export interface ActivityTimelineItem {
  id: string;
  profileId: string;
  learnerName: string;
  programId: string;
  programTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  activityId: string;
  resourceId: string;
  type: ResourceType;
  title: string;
  status: "pending" | "in_progress" | "complete";
  completedAt: string | null;
  updatedAt: string;
}

export interface ParentMonitoringQuizSummary {
  id: string;
  resourceId: string;
  title: string;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
}

export interface ParentMonitoringAlert {
  id: string;
  type: "progress" | "quiz" | "class" | "attention";
  severity: "info" | "success" | "warning";
  title: string;
  copy: string;
}

export interface ParentWeeklySummary {
  completedActivities: number;
  activeClasses: number;
  averageQuizPercent: number | null;
  latestActivityAt: string | null;
}

export interface ParentMonitoringChild {
  profileId: string;
  name: string;
  city: string | null;
  progress: LearnerProgressProgramSummary[];
  classes: BatchClass[];
  latestQuiz: ParentMonitoringQuizSummary[];
  weeklySummary: ParentWeeklySummary;
  alerts: ParentMonitoringAlert[];
  placeholders: {
    attendance: string;
    tutorNotes: string;
    paymentStatus: string;
  };
}

export interface ParentMonitoringResponse {
  children: ParentMonitoringChild[];
}

export type PaymentTargetType = "program_purchase" | "batch_admission";
export type PaymentOrderStatus = "requires_payment" | "paid" | "failed" | "cancelled" | "refunded";

export interface PaymentMethodConfig {
  id: string;
  type: "card" | "upi" | "netbanking";
  label: string;
  enabled: boolean;
  validation?: {
    allowedNetworks?: string[];
    allowedBanks?: string[];
    upiPattern?: string;
  };
}

export interface PaymentOrderSummary {
  id: string;
  role: Role;
  targetType: PaymentTargetType | string;
  targetId: string;
  programId?: string | null;
  batchId?: string | null;
  batchRequestId?: string | null;
  amount: number;
  currency: string;
  status: PaymentOrderStatus | string;
  gatewayProvider: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string | null;
  methodType?: string | null;
  paymentRail?: string | null;
  refundStatus: string;
  cancelReason?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
}

export interface TutorAccountingSummary {
  id: string;
  tutorProfileId: string;
  paymentOrderId?: string | null;
  sourceType: string;
  sourceId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: string;
  payoutReference?: string | null;
  createdAt: string;
}

export interface ProgramSummary {
  id: string;
  role: Role;
  title: string;
  description: string;
  selected?: boolean;
  status?: string;
  visibility?: string;
  creatorProfileId?: string | null;
  feeType?: "free" | "paid" | string;
  feeAmount?: number | null;
}

export interface TutorProgramSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  feeType: "free" | "paid" | string;
  feeAmount: number | null;
  milestoneCount: number;
  activityCount: number;
  selected?: boolean;
}

export interface TutorProgramResourceInput {
  type: ResourceType;
  title: string;
  description: string;
  body?: string;
  mediaUrl?: string;
  assetSlug?: string;
  assetProvider?: string;
  accessLevel?: string;
  assetVersion?: string;
  storageType?: string;
  thumbnailPath?: string;
  bannerPath?: string;
  vttPath?: string;
  metadataPath?: string;
  flashcards?: Array<{ question: string; answer: string; learnMore?: string; relatedArticleId?: string | null }>;
  quizQuestions?: Array<{
    prompt: string;
    options: string[];
    answerIndex: number;
    learnMore?: string;
    questionType?: "single" | "multi" | "free_text" | string;
    correctOptionIndexes?: number[];
    answerText?: string;
  }>;
}

export interface TutorResourceSummary {
  id: string;
  type: ResourceType;
  title: string;
  description: string;
  body?: string | null;
  sourceUrl?: string | null;
  assetMetadata: ResourceAssetMetadata;
  assetUrls: ResourceAssetUrls;
  flashcardCount: number;
  quizQuestionCount: number;
  usageCount: number;
  publishedUsageCount: number;
  createdAt: string;
}

export interface TutorProgramCreateInput {
  title: string;
  description: string;
  milestoneTitle?: string;
  visibility?: "private" | "published";
  feeType?: "free" | "paid";
  feeAmount?: number | null;
  resources?: TutorProgramResourceInput[];
  milestones?: Array<{
    title: string;
    sequence: number;
    resources: TutorProgramResourceInput[];
  }>;
}


export interface TutorBatchSummary {
  id: string;
  programId?: string | null;
  title: string;
  course: string;
  subject: string;
  grade: string;
  board: string;
  mode: string;
  schedule: string;
  classroomLocation: string | null;
  startsAt: string;
  capacity: number;
  status?: string;
  feeType?: string;
  feeAmount?: number | null;
  enrolledCount: number;
  requestCount: number;
  fillPercent?: number;
  availabilityStatus?: "booked" | "filling_fast" | "available" | string;
  onlineVideoLink: string | null;
  studentRequestStatus?: string | null;
  studentEnrollmentStatus?: string | null;
}

export interface TutorSupplyAnalytics {
  programs: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
  batches: {
    total: number;
    active: number;
    available: number;
    fillingFast: number;
    booked: number;
    archived: number;
  };
  requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    deferred: number;
    suggested: number;
  };
  enrollments: {
    active: number;
  };
}

export interface TutorSearchResult {
  id: string;
  tutorProfileId: string;
  profileId: string;
  name: string;
  initials: string;
  headline: string;
  subjects: string[];
  boards: string[];
  grades: string[];
  languages: string[];
  mode: string[];
  experienceYears: number;
  rating: number;
  hourlyRate: number;
  gender: string;
  location: string;
  bio: string;
  batches: TutorBatchSummary[];
  programs?: TutorProgramSummary[];
  tutionDetails?: TutionDetail[];
  curriculumSelections?: CurriculumSelection[];
  outreachEnabled?: boolean;
  outreachPlan?: string | null;
}

export interface MarketplaceProgramRecommendation {
  id: string;
  title: string;
  description: string;
  feeType: string;
  feeAmount?: number | null;
  milestoneCount: number;
  activityCount: number;
  tutor: Pick<TutorSearchResult, "id" | "tutorProfileId" | "profileId" | "name" | "initials" | "headline" | "rating" | "location" | "subjects" | "boards" | "grades" | "languages" | "mode" | "experienceYears" | "hourlyRate">;
  fitScore: number;
  fitReasons: string[];
}

export interface MarketplaceBatchRecommendation {
  id: string;
  title: string;
  course: string;
  subject: string;
  grade: string;
  board: string;
  mode: string;
  schedule: string;
  classroomLocation: string | null;
  onlineLink: string | null;
  startsAt: string;
  capacity: number;
  enrolledCount: number;
  fillPercent: number;
  availabilityStatus: string;
  feeType: string;
  feeAmount?: number | null;
  tutor: Pick<TutorSearchResult, "id" | "tutorProfileId" | "profileId" | "name" | "initials" | "headline" | "rating" | "location" | "subjects" | "boards" | "grades" | "languages" | "mode" | "experienceYears" | "hourlyRate">;
  programId?: string | null;
  fitScore: number;
  fitReasons: string[];
}

export interface MarketplaceRecommendationResponse {
  tutors: TutorSearchResult[];
  programs: MarketplaceProgramRecommendation[];
  batches: MarketplaceBatchRecommendation[];
}

export interface TutionDetail {
  id: string;
  subject: string;
  grade: string;
  board: string;
  mode: string;
  course: string;
  schedule: string;
  classroomLocation: string | null;
  onlineVideoLink: string | null;
  language: string[];
  gender: string;
  location: string;
  experienceYears: number;
  rating: number;
  hourlyRate: number;
}

export interface UserListItem {
  id: string;
  profileId: string;
  role: Role;
  name: string;
  initials: string;
  city: string | null;
}

export interface UserProfileDetails extends UserListItem {
  firstName: string;
  lastName: string;
  headline?: string;
  subjects?: string[];
  boards?: string[];
  grades?: string[];
  languages?: string[];
  mode?: string[];
  experienceYears?: number;
  rating?: number;
  hourlyRate?: number;
  gender?: string;
  location?: string;
  bio?: string;
  curriculumSelections?: CurriculumSelection[];
  outreachEnabled?: boolean;
  outreachPlan?: string | null;
  tutionDetails: TutionDetail[];
  batches?: TutorBatchSummary[];
  programs?: TutorProgramSummary[];
}

export interface BatchClass {
  id: string;
  batchId: string;
  title: string;
  course: string;
  subject: string;
  grade: string;
  board: string;
  mode: string;
  schedule: string;
  classroomLocation: string | null;
  onlineVideoLink: string | null;
  startsAt: string;
  tutorName: string;
  tutorHeadline: string;
  tutorRating: number;
  enrolledStudents?: Array<{ id: string; name: string; city: string | null }>;
  pendingRequests?: number;
}

export interface BatchRequestSummary {
  id: string;
  status: "pending" | "approved" | "rejected" | "deferred" | "suggested" | "dismissed" | "cancelled";
  message: string | null;
  tutorResponse?: string | null;
  suggestedBatchId?: string | null;
  suggestedBatch?: BatchClass | null;
  createdAt: string;
  timeline?: Array<{ key: string; label: string; status: "complete" | "current" | "pending"; at?: string | null }>;
  student: { id: string; name: string; city: string | null };
  tutor: { id: string; name: string; headline: string; rating: number };
  batch: BatchClass;
}

export type CommunityThreadStatus = "open" | "solved" | "archived";
export type CommunityReactionType = "upvote" | "helpful" | "like";

export interface CommunityAuthor {
  userId: string;
  profileId: string | null;
  name: string;
  initials: string;
  role: Role;
  anonymous: boolean;
}

export interface CommunityReactionCounts {
  upvote: number;
  helpful: number;
  like: number;
}

export interface CommunityComment {
  id: string;
  threadId: string;
  author: CommunityAuthor;
  body: string;
  verified: boolean;
  anonymous: boolean;
  reportCount?: number;
  moderatedStatus?: string;
  canReport?: boolean;
  reactionCounts: CommunityReactionCounts;
  myReactions: CommunityReactionType[];
  createdAt: string;
}

export interface CommunityThread {
  id: string;
  author: CommunityAuthor;
  role: Role;
  visibility: "public" | "program" | "batch" | string;
  programId: string | null;
  batchId: string | null;
  title: string;
  body: string;
  subject: string | null;
  milestoneTitle: string | null;
  status: CommunityThreadStatus;
  pinned: boolean;
  anonymous: boolean;
  attachmentUrl: string | null;
  reportCount?: number;
  moderatedStatus?: string;
  moderatedReason?: string | null;
  canComment?: boolean;
  canReact?: boolean;
  canReport?: boolean;
  commentCount: number;
  reactionCounts: CommunityReactionCounts;
  myReactions: CommunityReactionType[];
  createdAt: string;
  comments?: CommunityComment[];
}

export interface CommunityReportSummary {
  id: string;
  threadId: string | null;
  commentId: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export interface AdminUserSearchResult {
  id: string;
  phone: string;
  status: string;
  sourceTag: string;
  createdAt: string;
  updatedAt: string;
  profiles: Array<{
    id: string;
    role: Role | "admin";
    name: string;
    city: string | null;
    stream: string | null;
    specialization: string | null;
    profileStatus?: string | null;
    verificationStatus?: string | null;
  }>;
  counts: {
    programs: number;
    batches: number;
    batchRequests: number;
    enrollments: number;
    reminders: number;
    payments: number;
    threads: number;
  };
}

export interface AdminReviewSummary {
  id: string;
  entityType: string;
  entityId: string;
  reviewType: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  decision: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export interface AdminConfigSummary {
  id: string;
  key: string;
  scope: string;
  value: Record<string, unknown>;
  status: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditSummary {
  id: string;
  userId: string | null;
  profileId: string | null;
  role: Role | "admin" | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
