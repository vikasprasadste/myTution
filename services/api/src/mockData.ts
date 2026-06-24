import type { Persona, ProgramMilestone, Recommendation, Reminder, Role } from "@mytution/shared";

export const personas: Record<Role, Persona> = {
  student: {
    role: "student",
    firstName: "Apoorv",
    lastName: "Gulati",
    initials: "AG",
    phone: "+919876543210",
    profileLabel: "Student • Senior • CBSE Class 10 Math"
  },
  tutor: {
    role: "tutor",
    firstName: "Ankit",
    lastName: "Sharma",
    initials: "AS",
    phone: "+919876543210",
    profileLabel: "Tutor • Senior Math Specialist • South Delhi"
  },
  parent: {
    role: "parent",
    firstName: "Sarmishtha",
    lastName: "Gulati",
    initials: "SG",
    phone: "+919998887776",
    profileLabel: "Parent • Apoorv Gulati • Class 10"
  }
};

export const recommendations: Recommendation[] = [
  {
    id: "rec_video_algebra",
    role: "student",
    type: "video",
    title: "Class 10 algebra refresh",
    description: "8 minute practice guide",
    thumbnailLabel: "Video"
  },
  {
    id: "rec_flash_quadratic",
    role: "student",
    type: "flashcard",
    title: "Quadratic equations",
    description: "10 quick revision cards",
    thumbnailLabel: "Flashcard"
  },
  {
    id: "rec_article_cbse",
    role: "student",
    type: "article",
    title: "CBSE board prep planner",
    description: "Weekly study rhythm",
    thumbnailLabel: "Article"
  },
  {
    id: "rec_tutor_reviews",
    role: "tutor",
    type: "article",
    title: "How to request reviews",
    description: "Improve profile trust",
    thumbnailLabel: "Article"
  },
  {
    id: "rec_parent_trust",
    role: "parent",
    type: "article",
    title: "Tutor trust checklist",
    description: "Verification signals",
    thumbnailLabel: "Article"
  }
];

export const reminders: Reminder[] = [];

export const programMilestones: ProgramMilestone[] = Array.from({ length: 12 }).map((_, index) => ({
  id: `neet_${index + 1}`,
  sequence: index + 1,
  title: `Month ${index + 1}: NEET milestone`,
  locked: index > 0,
  resources: ["video", "article", "flashcard", "quiz"]
}));
