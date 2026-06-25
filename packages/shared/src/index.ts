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
    status: "pending" | "in_progress" | "complete";
  }>;
}

export interface ProgramSummary {
  id: string;
  role: Role;
  title: string;
  description: string;
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
