import "dotenv/config";
import crypto from "node:crypto";
import { ActivityStatus, PrismaClient, ResourceType, Role } from "@prisma/client";

const prisma = new PrismaClient();
const sourceTag = "mock";

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.mobileClient.deleteMany();
  await prisma.milestoneActivity.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.flashcard.deleteMany();
  await prisma.resourceProgress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.programProgress.deleteMany();
  await prisma.programMilestone.deleteMany();
  await prisma.program.deleteMany();
  await prisma.userManagement.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.mobileClient.create({
    data: {
      clientId: "mytution_mobile_app",
      name: "myTution Mobile App",
      sourceTag
    }
  });

  const user = await prisma.user.create({
    data: {
      phone: "+919876543210",
      passwordHash: await hashPassword("Password@123"),
      sourceTag,
      profiles: {
        create: [
          {
            role: Role.student,
            firstName: "Apoorv",
            lastName: "Gulati",
            dob: new Date("2010-06-24T00:00:00.000Z"),
            city: "Delhi",
            communicationAddress: "South Delhi, near Green Park",
            alternatePhone: "9999999999",
            stream: "senior",
            specialization: "CBSE Class 10 Mathematics",
            sourceTag
          },
          {
            role: Role.tutor,
            firstName: "Ankit",
            lastName: "Sharma",
            dob: new Date("2002-04-14T00:00:00.000Z"),
            city: "Delhi",
            communicationAddress: "South Delhi, near Green Park",
            alternatePhone: "9999999999",
            stream: "senior",
            specialization: "CBSE Class 10 Mathematics",
            sourceTag
          },
          {
            role: Role.parent,
            firstName: "Sarmishtha",
            lastName: "Gulati",
            dob: new Date("1984-01-12T00:00:00.000Z"),
            city: "Delhi",
            communicationAddress: "South Delhi, near Green Park",
            alternatePhone: "9999999999",
            sourceTag
          }
        ]
      }
    },
    include: { profiles: true }
  });

  await prisma.userManagement.createMany({
    data: user.profiles.map((profile) => ({
      userId: user.id,
      role: profile.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob,
      city: profile.city,
      communicationAddress: profile.communicationAddress,
      alternatePhone: profile.alternatePhone,
      avatarUrl: profile.avatarUrl,
      stream: profile.stream,
      specialization: profile.specialization,
      sourceTag
    }))
  });

  const algebraVideo = await prisma.resource.create({
    data: {
      type: ResourceType.video,
      title: "Class 10 algebra refresh",
      description: "8 minute practice guide for algebra basics",
      sourceTag
    }
  });

  const plannerArticle = await prisma.resource.create({
    data: {
      type: ResourceType.article,
      title: "CBSE board prep planner",
      description: "Weekly study rhythm and revision planning",
      body: "Plan revision by topic, alternate practice and review, and close each week with a timed test.",
      sourceTag
    }
  });

  const flashDeck = await prisma.resource.create({
    data: {
      type: ResourceType.flashcard,
      title: "Quadratic equations",
      description: "10 quick revision cards",
      sourceTag,
      flashcards: {
        create: Array.from({ length: 10 }).map((_, index) => ({
          sequence: index + 1,
          question: `Quadratic question ${index + 1}`,
          answer: `Quadratic answer ${index + 1}`,
          relatedArticleId: plannerArticle.id,
          sourceTag
        }))
      }
    }
  });

  const quizResource = await prisma.resource.create({
    data: {
      type: ResourceType.quiz,
      title: "Quadratic equations quiz",
      description: "Exam-style practice for roots and discriminants",
      sourceTag
    }
  });

  await prisma.recommendation.createMany({
    data: [
      {
        role: Role.student,
        type: ResourceType.video,
        title: algebraVideo.title,
        description: algebraVideo.description,
        thumbnailLabel: "Video",
        resourceId: algebraVideo.id,
        sourceTag
      },
      {
        role: Role.student,
        type: ResourceType.flashcard,
        title: flashDeck.title,
        description: flashDeck.description,
        thumbnailLabel: "Flashcard",
        resourceId: flashDeck.id,
        sourceTag
      },
      {
        role: Role.student,
        type: ResourceType.article,
        title: plannerArticle.title,
        description: plannerArticle.description,
        thumbnailLabel: "Article",
        resourceId: plannerArticle.id,
        sourceTag
      },
      {
        role: Role.parent,
        type: ResourceType.article,
        title: "Tutor trust checklist",
        description: "Verification signals before trial booking",
        thumbnailLabel: "Article",
        resourceId: plannerArticle.id,
        sourceTag
      },
      {
        role: Role.tutor,
        type: ResourceType.article,
        title: "How to request reviews",
        description: "Improve profile trust after completed classes",
        thumbnailLabel: "Article",
        resourceId: plannerArticle.id,
        sourceTag
      }
    ]
  });

  const medicalPrograms = [
    ["12 month NEET full course", "Full syllabus plan with monthly Biology, Chemistry, and Physics milestones", 12],
    ["NEET 90 day crash course", "High-intensity revision plan for high-yield chapters and mock practice", 6],
    ["NEET Biology masterclass", "Botany and Zoology focused program with NCERT recall drills", 8],
    ["NEET Chemistry revision sprint", "Physical, Organic, and Inorganic Chemistry revision with quizzes", 6],
    ["NEET Physics problem solving", "Mechanics, electrodynamics, optics, and modern physics practice", 8],
    ["AIIMS nursing entrance prep", "Medical aptitude, biology basics, and exam readiness milestones", 6],
    ["Class 11 medical foundation", "Early foundation for future NEET aspirants", 10],
    ["Class 12 board plus NEET bridge", "Board exam alignment with NEET-style topic practice", 8]
  ] as const;

  const createdPrograms = [];
  for (const [title, description, count] of medicalPrograms) {
    const program = await prisma.program.create({
      data: {
        role: Role.student,
        title,
        description,
        sourceTag,
        milestones: {
          create: Array.from({ length: count }).map((_, index) => ({
            sequence: index + 1,
            title: `${title.split(" ")[0]} milestone ${index + 1}`,
            sourceTag
          }))
        }
      }
    });
    createdPrograms.push(program);

    const milestones = await prisma.programMilestone.findMany({
      where: { programId: program.id },
      orderBy: { sequence: "asc" }
    });

    for (const milestone of milestones) {
      await prisma.milestoneActivity.createMany({
        data: [
          {
            milestoneId: milestone.id,
            resourceId: algebraVideo.id,
            sequence: 1,
            type: ResourceType.video,
            title: "Watch topic video",
            description: algebraVideo.description,
            status: milestone.sequence === 1 ? ActivityStatus.in_progress : ActivityStatus.pending,
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: plannerArticle.id,
            sequence: 2,
            type: ResourceType.article,
            title: "Read topic notes",
            description: plannerArticle.description,
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: flashDeck.id,
            sequence: 3,
            type: ResourceType.flashcard,
            title: "Practice flashcards",
            description: flashDeck.description,
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: quizResource.id,
            sequence: 4,
            type: ResourceType.quiz,
            title: "Complete quiz",
            description: quizResource.description,
            sourceTag
          }
        ]
      });
    }
  }

  const studentProfile = user.profiles.find((profile) => profile.role === Role.student);
  if (studentProfile) {
    await prisma.programProgress.create({
      data: {
        profileId: studentProfile.id,
        programId: createdPrograms[0].id,
        unlockedMilestoneSequence: 1,
        completedMilestoneSequence: 0,
        sourceTag
      }
    });
  }

  for (const profile of user.profiles) {
    await prisma.reminder.create({
      data: {
        userId: user.id,
        profileId: profile.id,
        role: profile.role,
        title: profile.role === Role.parent ? "Math revision reminder" : "Trial class follow-up",
        startsAt: new Date("2026-06-24T13:00:00.000Z"),
        sourceTag
      }
    });
  }
}

function hashPassword(password: string) {
  const salt = "mock_salt";
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
