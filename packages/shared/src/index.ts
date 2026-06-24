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
}
