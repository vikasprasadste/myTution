import type { FeatureFlagKey, Role } from "@mytution/shared";

export interface FeatureFlag {
  enabled: boolean;
  roles?: Role[];
  description: string;
}

export const featureFlags: Record<FeatureFlagKey, FeatureFlag> = {
  aiMatching: {
    enabled: true,
    description: "AI-based tutor and content matching"
  },
  avatarUpload: {
    enabled: true,
    description: "Camera/gallery avatar upload"
  },
  biometrics: {
    enabled: true,
    description: "Optional device biometric unlock"
  },
  chat: {
    enabled: true,
    description: "Tutor/student/parent chat"
  },
  eventsReminders: {
    enabled: true,
    description: "Create, edit, delete reminders"
  },
  flashcards: {
    enabled: true,
    description: "Flashcard learning resources"
  },
  payments: {
    enabled: true,
    description: "Payment methods and payment flows"
  },
  programSessions: {
    enabled: true,
    description: "Role-customized programs and sessions"
  },
  recommendations: {
    enabled: true,
    description: "Home recommendation carousel"
  },
  reviews: {
    enabled: true,
    description: "Ratings and reviews"
  },
  tutorDiscovery: {
    enabled: true,
    roles: ["student", "parent"],
    description: "Tutor search and discovery"
  }
};

export function isFeatureEnabled(flag: FeatureFlagKey, role?: Role) {
  const config = featureFlags[flag];
  if (!config.enabled) return false;
  if (!role || !config.roles) return true;
  return config.roles.includes(role);
}
