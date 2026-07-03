export type Role = "student" | "tutor" | "parent";

export type Stream = "junior" | "senior" | "ug" | "pg";

export type ResourceType = "video" | "article" | "flashcard" | "quiz";

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

export interface Reminder {
  id: string;
  role: Role;
  title: string;
  startsAt: string;
  status: "active" | "completed" | "cancelled";
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
}

export interface TutorProgramResourceInput {
  type: ResourceType;
  title: string;
  description: string;
  body?: string;
  mediaUrl?: string;
  flashcards?: Array<{ question: string; answer: string }>;
  quizQuestions?: Array<{ prompt: string; options: string[]; answerIndex: number; learnMore?: string }>;
}

export interface TutorProgramCreateInput {
  title: string;
  description: string;
  milestoneTitle: string;
  visibility?: "private" | "published";
  feeType?: "free" | "paid";
  feeAmount?: number | null;
  resources: TutorProgramResourceInput[];
}


export interface TutorBatchSummary {
  id: string;
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
  enrolledCount: number;
  requestCount: number;
  onlineVideoLink: string | null;
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
  status: "pending" | "approved" | "rejected";
  message: string | null;
  createdAt: string;
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
  reactionCounts: CommunityReactionCounts;
  myReactions: CommunityReactionType[];
  createdAt: string;
}

export interface CommunityThread {
  id: string;
  author: CommunityAuthor;
  role: Role;
  title: string;
  body: string;
  subject: string | null;
  milestoneTitle: string | null;
  status: CommunityThreadStatus;
  pinned: boolean;
  anonymous: boolean;
  attachmentUrl: string | null;
  commentCount: number;
  reactionCounts: CommunityReactionCounts;
  myReactions: CommunityReactionType[];
  createdAt: string;
  comments?: CommunityComment[];
}
