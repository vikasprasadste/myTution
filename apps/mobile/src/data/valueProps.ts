import type { Role } from "@mytution/shared";

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
