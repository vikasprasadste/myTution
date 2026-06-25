import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient, ResourceType, Role } from "@prisma/client";

const prisma = new PrismaClient();
const sourceTag = "mock";

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.mobileClient.deleteMany();
  await prisma.activityProgress.deleteMany();
  await prisma.milestoneActivity.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.flashcard.deleteMany();
  await prisma.resourceProgress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.studentProgramSelection.deleteMany();
  await prisma.programProgress.deleteMany();
  await prisma.programMilestone.deleteMany();
  await prisma.program.deleteMany();
  await prisma.batchEnrollment.deleteMany();
  await prisma.batchRequest.deleteMany();
  await prisma.tutorBatch.deleteMany();
  await prisma.tutorProfile.deleteMany();
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


  const tutorFixtures = [
    ["Neha", "Verma", "CBSE Mathematics specialist", "Mathematics", "CBSE", "Class 9,Class 10", "English,Hindi", "Online,Home Tuition", 8, 4.9, 850, "Female", "South Delhi", "Class 10 board-focused algebra, geometry, and exam writing support."],
    ["Rahul", "Menon", "Physics mentor for medical aspirants", "Physics", "CBSE,State", "Class 11,Class 12", "English", "Online", 10, 4.8, 1000, "Male", "Gurgaon", "Numerical practice, concept videos, and NEET-style doubt clearing."],
    ["Ananya", "Iyer", "Biology NCERT mastery coach", "Biology", "CBSE,ICSE", "Class 11,Class 12", "English,Hindi", "Online,Home Tuition", 7, 4.8, 900, "Female", "Noida", "NCERT diagrams, active recall, and high-yield biology milestones."],
    ["Karan", "Malhotra", "Chemistry problem solving tutor", "Chemistry", "CBSE", "Class 11,Class 12", "English,Hindi", "Online", 6, 4.7, 800, "Male", "Delhi", "Physical, organic, and inorganic chemistry with weekly diagnostics."],
    ["Priya", "Nair", "Junior science foundation tutor", "Science", "CBSE,ICSE", "Class 6,Class 7,Class 8", "English", "Home Tuition", 5, 4.6, 650, "Female", "South Delhi", "Strong basics for middle-school science and study discipline."],
    ["Arjun", "Kapoor", "Mathematics olympiad and boards tutor", "Mathematics", "CBSE,IB", "Class 8,Class 9,Class 10", "English,Hindi", "Online,Home Tuition", 9, 4.9, 950, "Male", "Delhi", "Problem solving for boards, school exams, and advanced practice."],
    ["Sana", "Khan", "English communication and grammar tutor", "English", "CBSE,ICSE", "Class 5,Class 6,Class 7,Class 8", "English,Hindi", "Online", 6, 4.7, 600, "Female", "Mumbai", "Reading fluency, grammar, and writing confidence."],
    ["Vikram", "Rao", "Accounts and commerce faculty", "Commerce", "CBSE,State", "Class 11,Class 12,UG", "English", "Online", 12, 4.8, 1100, "Male", "Bengaluru", "Accounting fundamentals, business studies, and exam practice."],
    ["Meera", "Chopra", "Computer science and coding tutor", "Computer Science", "CBSE,ICSE,IGCSE", "Class 9,Class 10,Class 11,Class 12", "English,Hindi", "Online", 8, 4.7, 900, "Female", "Pune", "Python, logic building, practical files, and board projects."],
    ["Dev", "Sinha", "NEET crash course mentor", "Biology,Chemistry", "CBSE", "Class 12,Dropper", "English,Hindi", "Online", 11, 4.9, 1200, "Male", "Kolkata", "High-intensity revision for NEET biology and chemistry."],
    ["Ritika", "Bose", "ICSE mathematics and science coach", "Mathematics,Science", "ICSE", "Class 8,Class 9,Class 10", "English", "Home Tuition", 7, 4.6, 750, "Female", "Kolkata", "ICSE exam patterns, labelling, and structured answers."],
    ["Amit", "Tandon", "JEE and senior physics faculty", "Physics,Mathematics", "CBSE,State", "Class 11,Class 12", "English,Hindi", "Online", 14, 4.8, 1300, "Male", "Delhi", "Mechanics, calculus, and weekly test analysis."],
    ["Lata", "Mishra", "Primary learning specialist", "Mathematics,English", "CBSE,ICSE", "Class 1,Class 2,Class 3,Class 4,Class 5", "English,Hindi", "Home Tuition", 9, 4.8, 550, "Female", "Noida", "Foundational numeracy, reading, and parent-friendly progress notes."],
    ["Siddharth", "Jain", "UG statistics and mathematics tutor", "Mathematics,Statistics", "UG", "UG", "English", "Online", 8, 4.5, 1000, "Male", "Jaipur", "College mathematics, statistics, and assignment support."],
    ["Farah", "Ali", "IGCSE science tutor", "Science,Biology", "IGCSE,IB", "Class 8,Class 9,Class 10", "English", "Online", 6, 4.6, 950, "Female", "Hyderabad", "International curriculum science with visual notes and practice."],
    ["Manish", "Batra", "Class 10 board booster", "Mathematics,Science", "CBSE,State", "Class 10", "English,Hindi", "Online,Home Tuition", 10, 4.7, 800, "Male", "Delhi", "Board revision, previous-year papers, and exam strategy."]
  ] as const;

  for (const [index, item] of tutorFixtures.entries()) {
    const [firstName, lastName, headline, subjects, boards, grades, languages, mode, experienceYears, rating, hourlyRate, gender, location, bio] = item;
    const tutorUser = await prisma.user.create({
      data: {
        phone: "+9198000000" + String(index + 1).padStart(2, "0"),
        passwordHash: await hashPassword("Password@123"),
        sourceTag,
        profiles: {
          create: {
            role: Role.tutor,
            firstName,
            lastName,
            dob: new Date("198" + (index % 10) + "-05-15T00:00:00.000Z"),
            city: location,
            communicationAddress: location + " teaching centre",
            alternatePhone: "98990000" + String(index + 1).padStart(2, "0"),
            stream: grades.includes("UG") ? "ug" : "senior",
            specialization: boards.split(",")[0] + " " + grades.split(",")[0] + " " + subjects.split(",")[0],
            sourceTag
          }
        }
      },
      include: { profiles: true }
    });
    const profile = tutorUser.profiles[0];
    await prisma.userManagement.create({
      data: {
        userId: tutorUser.id,
        role: Role.tutor,
        firstName,
        lastName,
        dob: profile.dob,
        city: location,
        communicationAddress: profile.communicationAddress,
        alternatePhone: profile.alternatePhone,
        stream: profile.stream,
        specialization: profile.specialization,
        sourceTag
      }
    });
    const tutorProfile = await prisma.tutorProfile.create({
      data: {
        profileId: profile.id,
        headline,
        subjects,
        boards,
        grades,
        languages,
        mode,
        experienceYears,
        rating,
        hourlyRate,
        gender,
        location,
        bio,
        sourceTag
      }
    });
    const primarySubject = subjects.split(",")[0];
    const primaryGrade = grades.split(",")[0];
    const primaryBoard = boards.split(",")[0];
    await prisma.tutorBatch.createMany({
      data: [
        {
          tutorProfileId: tutorProfile.id,
          title: primaryGrade + " " + primarySubject + " weekday batch",
          course: primaryBoard + " " + primarySubject + " foundation",
          subject: primarySubject,
          grade: primaryGrade,
          board: primaryBoard,
          mode: mode.includes("Online") ? "Online" : "Home Tuition",
          schedule: "Mon, Wed, Fri • 6:00 PM",
          classroomLocation: mode.includes("Home Tuition") ? location + " learning studio" : null,
          onlineLink: mode.includes("Online") ? "https://meet.mytution.test/batch-" + (index + 1) : null,
          startsAt: new Date("2026-06-" + String(26 + (index % 3)).padStart(2, "0") + "T12:30:00.000Z"),
          capacity: 12,
          sourceTag
        },
        {
          tutorProfileId: tutorProfile.id,
          title: primarySubject + " weekend booster",
          course: primarySubject + " exam practice",
          subject: primarySubject,
          grade: primaryGrade,
          board: primaryBoard,
          mode: "Online",
          schedule: "Sat, Sun • 10:00 AM",
          classroomLocation: null,
          onlineLink: "https://meet.mytution.test/weekend-" + (index + 1),
          startsAt: new Date("2026-06-" + String(27 + (index % 2)).padStart(2, "0") + "T04:30:00.000Z"),
          capacity: 20,
          sourceTag
        }
      ]
    });
  }

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
            title: "Concept video: high-yield foundation",
            description: "An 8-15 minute focused lesson introducing one core concept with diagrams and examples.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: plannerArticle.id,
            sequence: 2,
            type: ResourceType.article,
            title: "Interactive article and micro-notes",
            description: "Bold keywords, step-by-step derivations, labeled diagrams, and board-ready summaries.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: flashDeck.id,
            sequence: 3,
            type: ResourceType.flashcard,
            title: "Digital flashcards for active recall",
            description: "Formulae, named reactions, biology labels, units, and definitions for quick memorization.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: plannerArticle.id,
            sequence: 4,
            type: ResourceType.article,
            title: "Formula and concept cheat sheet",
            description: "A one-page milestone summary to review before moving to practice and assessment.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: quizResource.id,
            sequence: 5,
            type: ResourceType.quiz,
            title: "Diagnostic MCQ quiz",
            description: "5-10 conceptual MCQs to prove readiness before unlocking the next milestone.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: quizResource.id,
            sequence: 6,
            type: ResourceType.quiz,
            title: "Board-style subjective questions",
            description: "Past board-style long answers with topper-style marking guidance and scoring patterns.",
            sourceTag
          }
        ]
      });
    }
  }

  const studentProfile = user.profiles.find((profile) => profile.role === Role.student);
  if (studentProfile) {
    await prisma.studentProgramSelection.create({
      data: {
        profileId: studentProfile.id,
        programId: createdPrograms[0].id,
        sourceTag
      }
    });
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
