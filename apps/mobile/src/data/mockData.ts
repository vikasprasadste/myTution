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

export const roleValueProps: Record<Role, Array<{ icon: string; title: string; desc: string }>> = {
  student: [
    {
      icon: "🎓",
      title: "Find verified tutors",
      desc: "Discover trusted home and online tutors by class, board, language, rating, and availability."
    },
    {
      icon: "🗓",
      title: "Book trial classes",
      desc: "Compare tutors, chat safely, and book trial sessions with transparent pricing."
    },
    {
      icon: "✨",
      title: "Learn with smart picks",
      desc: "Get personalized videos, articles, flashcards, and tutor matches for your goals."
    }
  ],
  tutor: [
    {
      icon: "📚",
      title: "Receive qualified leads",
      desc: "Get matched with students by subject, location, mode, language, and schedule."
    },
    {
      icon: "🗓",
      title: "Run your teaching day",
      desc: "Manage sessions, reminders, chat, reviews, and availability from one place."
    },
    {
      icon: "₹",
      title: "Grow with trust",
      desc: "Build a verified profile, collect ratings, and track payments and payouts."
    }
  ],
  parent: [
    {
      icon: "✓",
      title: "Track learning clearly",
      desc: "Follow sessions, tutor notes, attendance, and payment activity for your child."
    },
    {
      icon: "★",
      title: "Approve with confidence",
      desc: "Review tutor trust signals, trial classes, and upcoming reminders before committing."
    },
    {
      icon: "🔔",
      title: "Stay on top of classes",
      desc: "Use reminders for fees, classes, parent approvals, and study follow-ups."
    }
  ]
};

export const recommendations: Recommendation[] = [
  {
    id: "video_algebra",
    role: "student",
    type: "video",
    title: "Class 10 algebra refresh",
    description: "8 minute practice guide",
    thumbnailLabel: "Video"
  },
  {
    id: "flash_quadratic",
    role: "student",
    type: "flashcard",
    title: "Quadratic equations",
    description: "10 quick revision cards",
    thumbnailLabel: "Cards"
  },
  {
    id: "article_cbse",
    role: "student",
    type: "article",
    title: "CBSE board prep planner",
    description: "Weekly study rhythm",
    thumbnailLabel: "Article"
  },
  {
    id: "video_neet",
    role: "student",
    type: "video",
    title: "NEET biology warm-up",
    description: "Cell biology basics",
    thumbnailLabel: "Video"
  },
  {
    id: "article_trial",
    role: "student",
    type: "article",
    title: "Trial class checklist",
    description: "Questions to ask tutors",
    thumbnailLabel: "Practice"
  },
  {
    id: "tutor_leads",
    role: "tutor",
    type: "article",
    title: "3 students need Math tutors",
    description: "Respond before 7 PM",
    thumbnailLabel: "Lead"
  },
  {
    id: "tutor_payouts",
    role: "tutor",
    type: "video",
    title: "Payout readiness tips",
    description: "Reduce failed settlements",
    thumbnailLabel: "Video"
  },
  {
    id: "tutor_demo_cards",
    role: "tutor",
    type: "flashcard",
    title: "Tutor demo prompts",
    description: "10 trial class cards",
    thumbnailLabel: "Cards"
  },
  {
    id: "tutor_reviews",
    role: "tutor",
    type: "article",
    title: "How to request reviews",
    description: "Improve profile trust",
    thumbnailLabel: "Article"
  },
  {
    id: "tutor_verify",
    role: "tutor",
    type: "video",
    title: "Verified profile walkthrough",
    description: "Unlock verified badge",
    thumbnailLabel: "Video"
  },
  {
    id: "parent_progress",
    role: "parent",
    type: "article",
    title: "Apoorv's weekly learning view",
    description: "Attendance and notes",
    thumbnailLabel: "Progress"
  },
  {
    id: "parent_payments",
    role: "parent",
    type: "video",
    title: "Upcoming tuition payments",
    description: "Receipts and approvals",
    thumbnailLabel: "Payment"
  },
  {
    id: "parent_trust",
    role: "parent",
    type: "article",
    title: "Tutor trust checklist",
    description: "Verification signals",
    thumbnailLabel: "Article"
  },
  {
    id: "parent_trial_cards",
    role: "parent",
    type: "flashcard",
    title: "Parent trial checklist",
    description: "10 questions to ask",
    thumbnailLabel: "Cards"
  },
  {
    id: "parent_notes",
    role: "parent",
    type: "article",
    title: "Teacher preparation notes",
    description: "What to review at home",
    thumbnailLabel: "Notes"
  }
];

export const starterReminders: Reminder[] = [];

export const programMilestones: ProgramMilestone[] = Array.from({ length: 12 }).map((_, index) => ({
  id: `neet_${index + 1}`,
  sequence: index + 1,
  title: `Month ${index + 1}: NEET milestone`,
  locked: index > 0,
  resources: ["video", "article", "flashcard", "quiz"]
}));
