import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient, ResourceType, Role } from "@prisma/client";

const prisma = new PrismaClient();
const sourceTag = "mock";

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.mobileClient.deleteMany();
  await prisma.communityReaction.deleteMany();
  await prisma.communityComment.deleteMany();
  await prisma.communityThread.deleteMany();
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

  const communityStudentProfile = user.profiles.find((profile) => profile.role === Role.student);
  const communityTutorProfile = user.profiles.find((profile) => profile.role === Role.tutor);
  if (communityStudentProfile && communityTutorProfile) {
    const pinnedThread = await prisma.communityThread.create({
      data: {
        ownerUserId: user.id,
        ownerProfileId: communityTutorProfile.id,
        role: Role.student,
        title: "[5-Mark Blueprint] Gauss's Law derivation",
        body: "How to derive electric field intensity due to an infinitely long straight uniformly charged wire using Gauss's Law?",
        subject: "Physics",
        milestoneTitle: "Milestone 3: Gauss's Law",
        status: "solved",
        pinned: true,
        sourceTag,
        comments: {
          create: {
            ownerUserId: user.id,
            ownerProfileId: communityTutorProfile.id,
            body: "Use a cylindrical Gaussian surface because it matches the symmetry of a line charge. The field is constant on the curved surface and perpendicular to the end caps, so only the curved area contributes.",
            verified: true,
            sourceTag
          }
        }
      }
    });
    const peerThread = await prisma.communityThread.create({
      data: {
        ownerUserId: user.id,
        ownerProfileId: communityStudentProfile.id,
        role: Role.student,
        title: "Choosing a Gaussian surface",
        body: "Stuck on Quiz Question 4. Why do we assume the Gaussian surface to be cylindrical for a linear line charge? Why not a spherical one?",
        subject: "Physics",
        milestoneTitle: "Milestone 3: Gauss's Law",
        status: "solved",
        sourceTag,
        comments: {
          create: {
            ownerUserId: user.id,
            ownerProfileId: communityTutorProfile.id,
            body: "A cylinder keeps every point on the curved face at the same distance from the line charge. A sphere would not preserve that symmetry for a long straight wire.",
            verified: true,
            sourceTag
          }
        }
      }
    });
    await prisma.communityThread.create({
      data: {
        ownerUserId: user.id,
        ownerProfileId: communityStudentProfile.id,
        role: Role.student,
        title: "Flux angle confusion",
        body: "In the formula Phi = integral E dot dA, is the angle always evaluated between the field vector and surface normal vector?",
        subject: "Physics",
        milestoneTitle: "Milestone 3: Gauss's Law",
        status: "open",
        anonymous: true,
        sourceTag
      }
    });
    await prisma.communityReaction.createMany({
      data: [
        { userId: user.id, threadId: pinnedThread.id, type: "upvote", sourceTag },
        { userId: user.id, threadId: pinnedThread.id, type: "helpful", sourceTag },
        { userId: user.id, threadId: peerThread.id, type: "upvote", sourceTag }
      ]
    });
  }


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
        phone: index === 0 ? "+917838920129" : "+9198000000" + String(index + 1).padStart(2, "0"),
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
    if (index === 0) {
      await createMockTutorProgram(profile.id, {
        title: "Class 10 board exam free foundation",
        description: "Free starter program with algebra notes, video, flashcards, and a diagnostic quiz.",
        milestoneTitle: "Milestone 1: Algebra foundations",
        feeType: "free",
        feeAmount: null
      });
      await createMockTutorProgram(profile.id, {
        title: "Class 10 board exam 2 month crash course",
        description: "Paid crash course with weekly milestones for board exam revision and practice.",
        milestoneTitle: "Milestone 1: High-yield algebra revision",
        feeType: "paid",
        feeAmount: 2500
      });
    }
  }

  const motionArticleBody = "Motion in a straight line studies movement along one chosen axis. Choose a positive direction first. Once that choice is made, displacement, velocity, and acceleration can be positive, negative, or zero depending on direction.\n\nDistance is the total path length covered. It is always non-negative. Displacement is the change in position from the starting point to the ending point. A learner can travel a large distance and still have zero displacement if they return to the starting point.\n\nAverage speed equals total distance divided by total time. Average velocity equals displacement divided by total time. Speed is a scalar; velocity is a vector. This distinction matters in graph questions and sign-convention questions.\n\nAcceleration is the rate of change of velocity. If velocity increases in the positive direction, acceleration is positive. If velocity decreases while the object is still moving in the positive direction, acceleration is negative.\n\nGraph clues are powerful. On a position-time graph, slope gives velocity. On a velocity-time graph, slope gives acceleration, while the signed area under the graph gives displacement.\n\nKeep units visible: displacement in metre, velocity in metre per second, and acceleration in metre per second squared. Unit discipline prevents many avoidable mistakes in physics numericals.";

  const motionArticle = await prisma.resource.create({
    data: {
      type: ResourceType.article,
      title: "Kinematics micro-notes for NEET foundation",
      description: "Exam-ready notes on distance, displacement, velocity, acceleration, units, and graph clues.",
      body: motionArticleBody,
      assetSlug: "ams/mock/article/program/neet-foundation/motion-micronotes/v1",
      storageType: "repo",
      thumbnailPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/thumbnail.svg",
      bannerPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/banner.svg",
      metadataPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/title-description.md",
      sourceUrl: "https://openstax.org/books/college-physics-2e/pages/2-introduction-to-one-dimensional-kinematics",
      contentJson: {
        readingMinutes: 4,
        articleText: motionArticleBody,
        sourceNotes: ["OpenStax College Physics 2e", "NCERT Class 11 Physics Motion in a Straight Line", "Khan Academy one-dimensional motion"]
      },
      sourceTag
    }
  });

  const motionVideo = await prisma.resource.create({
    data: {
      type: ResourceType.video,
      title: "Motion in a Straight Line: displacement, velocity, acceleration",
      description: "Short concept video for Class 11 medical foundation learners.",
      body: "Use the captions and summary to review the concept video. The lesson connects displacement, velocity, acceleration, and graph interpretation for one-dimensional motion.",
      assetSlug: "ams/mock/video/program/neet-foundation/kinematics-motion/v1",
      storageType: "repo",
      thumbnailPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/thumbnail.svg",
      bannerPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/banner.svg",
      vttPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/captions.vtt",
      metadataPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/title-description.md",
      sourceUrl: "https://www.khanacademy.org/science/physics/one-dimensional-motion",
      contentJson: {
        durationSeconds: 480,
        videoKind: "concept",
        mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        mediaNote: "MVP playback sample. Replace with repo or bucket-hosted lesson MP4 when production content is ready.",
        transcriptSummary: [
          "Distance is total path length; displacement is change in position with direction.",
          "Average speed uses distance; average velocity uses displacement.",
          "Acceleration is change in velocity per unit time.",
          "Position-time slope gives velocity; velocity-time slope gives acceleration."
        ]
      },
      sourceTag
    }
  });

  const motionFlashcards = [
    ["What is displacement?", "Displacement is the change in position from start to finish, measured with direction."],
    ["How is distance different from displacement?", "Distance is total path length. Displacement depends only on initial and final position."],
    ["What is average speed?", "Average speed equals total distance divided by total time."],
    ["What is average velocity?", "Average velocity equals displacement divided by total time."],
    ["What does acceleration measure?", "Acceleration measures the rate of change of velocity with time."],
    ["What is the SI unit of acceleration?", "Metre per second squared, written as m/s²."],
    ["What does slope on a position-time graph represent?", "The slope of a position-time graph represents velocity."],
    ["What does slope on a velocity-time graph represent?", "The slope of a velocity-time graph represents acceleration."],
    ["What does area under a velocity-time graph represent?", "The signed area under a velocity-time graph represents displacement."],
    ["Can speed be negative?", "No. Speed is a scalar path-rate and is never negative."]
  ];

  const motionFlashDeck = await prisma.resource.create({
    data: {
      type: ResourceType.flashcard,
      title: "Motion active recall cards",
      description: "10 flashcards for one-dimensional motion definitions, units, and graphs.",
      assetSlug: "ams/mock/flashcard/program/neet-foundation/motion-active-recall/v1",
      storageType: "repo",
      thumbnailPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/thumbnail.svg",
      bannerPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/banner.svg",
      metadataPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/title-description.md",
      contentJson: {
        deckPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/deck.json",
        cardCount: motionFlashcards.length
      },
      sourceTag,
      flashcards: {
        create: motionFlashcards.map(([question, answer], index) => ({
          sequence: index + 1,
          question,
          answer,
          relatedArticleId: motionArticle.id,
          sourceTag
        }))
      }
    }
  });

  const motionQuizQuestions = [
    {
      id: "motion-q1",
      prompt: "A student walks 5 m east and then 5 m west. What is the displacement?",
      options: ["10 m east", "10 m west", "0 m", "5 m east"],
      answerIndex: 2,
      learnMore: "Displacement depends only on final position relative to the starting point."
    },
    {
      id: "motion-q2",
      prompt: "Which quantity is always non-negative?",
      options: ["Velocity", "Displacement", "Acceleration", "Distance"],
      answerIndex: 3,
      learnMore: "Distance measures total path length, so it cannot be negative."
    },
    {
      id: "motion-q3",
      prompt: "The slope of a position-time graph gives which quantity?",
      options: ["Velocity", "Displacement", "Acceleration", "Distance"],
      answerIndex: 0,
      learnMore: "Change in position divided by change in time is velocity."
    },
    {
      id: "motion-q4",
      prompt: "The SI unit of acceleration is:",
      options: ["m", "m/s", "m/s²", "s/m"],
      answerIndex: 2,
      learnMore: "Acceleration is change in velocity per unit time, so the unit is m/s²."
    },
    {
      id: "motion-q5",
      prompt: "On a velocity-time graph, the area under the graph represents:",
      options: ["Acceleration", "Speed only", "Displacement", "Mass"],
      answerIndex: 2,
      learnMore: "Velocity multiplied by time gives displacement."
    },
    {
      id: "motion-q6",
      prompt: "If velocity is constant, acceleration is:",
      options: ["Zero", "Always positive", "Always negative", "Equal to distance"],
      answerIndex: 0,
      learnMore: "Acceleration measures change in velocity. With no change, acceleration is zero."
    }
  ];

  const motionQuiz = await prisma.resource.create({
    data: {
      type: ResourceType.quiz,
      title: "Motion diagnostic quiz",
      description: "6 MCQs to check distance, displacement, velocity, acceleration, and graph interpretation.",
      assetSlug: "ams/mock/quiz/program/neet-foundation/motion-diagnostic/v1",
      storageType: "repo",
      thumbnailPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/thumbnail.svg",
      bannerPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/banner.svg",
      metadataPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/title-description.md",
      contentJson: {
        questions: motionQuizQuestions,
        quizPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/quiz.json"
      },
      sourceTag
    }
  });

  await prisma.recommendation.createMany({
    data: [
      {
        role: Role.student,
        type: ResourceType.video,
        title: motionVideo.title,
        description: motionVideo.description,
        thumbnailLabel: "Video",
        resourceId: motionVideo.id,
        sourceTag
      },
      {
        role: Role.student,
        type: ResourceType.flashcard,
        title: motionFlashDeck.title,
        description: motionFlashDeck.description,
        thumbnailLabel: "Flashcard",
        resourceId: motionFlashDeck.id,
        sourceTag
      },
      {
        role: Role.student,
        type: ResourceType.article,
        title: motionArticle.title,
        description: motionArticle.description,
        thumbnailLabel: "Article",
        resourceId: motionArticle.id,
        sourceTag
      },
      {
        role: Role.student,
        type: ResourceType.quiz,
        title: motionQuiz.title,
        description: motionQuiz.description,
        thumbnailLabel: "Quiz",
        resourceId: motionQuiz.id,
        sourceTag
      },
      {
        role: Role.parent,
        type: ResourceType.article,
        title: "Tutor trust checklist",
        description: "Verification signals before trial booking",
        thumbnailLabel: "Article",
        resourceId: motionArticle.id,
        sourceTag
      },
      {
        role: Role.tutor,
        type: ResourceType.article,
        title: "How to request reviews",
        description: "Improve profile trust after completed classes",
        thumbnailLabel: "Article",
        resourceId: motionArticle.id,
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
            resourceId: motionVideo.id,
            sequence: 1,
            type: ResourceType.video,
            title: "Concept video: motion in one dimension",
            description: "A focused lesson introducing displacement, velocity, acceleration, units, and graph clues.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: motionArticle.id,
            sequence: 2,
            type: ResourceType.article,
            title: "Kinematics micro-notes",
            description: "Read the core definitions, sign convention, graph meanings, and unit reminders.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: motionFlashDeck.id,
            sequence: 3,
            type: ResourceType.flashcard,
            title: "Motion active recall cards",
            description: "Review distance, displacement, speed, velocity, acceleration, and graph facts.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: motionArticle.id,
            sequence: 4,
            type: ResourceType.article,
            title: "Formula and concept cheat sheet",
            description: "A milestone summary for units, graph slopes, and common conceptual traps.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: motionQuiz.id,
            sequence: 5,
            type: ResourceType.quiz,
            title: "Diagnostic MCQ quiz",
            description: "Six conceptual MCQs to prove readiness before unlocking the next milestone.",
            sourceTag
          },
          {
            milestoneId: milestone.id,
            resourceId: motionQuiz.id,
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

async function createMockTutorProgram(profileId: string, input: { title: string; description: string; milestoneTitle: string; feeType: "free" | "paid"; feeAmount: number | null }) {
  const article = await prisma.resource.create({
    data: {
      creatorProfileId: profileId,
      type: ResourceType.article,
      title: input.title + " notes",
      description: "Board-focused micro-notes with formulas, examples, and answer-writing tips.",
      body: "Use this article to revise definitions, identities, worked examples, and step-by-step board answer patterns.",
      storageType: "db",
      sourceTag
    }
  });
  const video = await prisma.resource.create({
    data: {
      creatorProfileId: profileId,
      type: ResourceType.video,
      title: input.title + " concept video",
      description: "Short lesson explaining the core concept before practice.",
      sourceUrl: "https://example.com/mytution/class-10-board-program.mp4",
      storageType: "db",
      sourceTag
    }
  });
  const flashcard = await prisma.resource.create({
    data: {
      creatorProfileId: profileId,
      type: ResourceType.flashcard,
      title: input.title + " recall cards",
      description: "Quick active recall cards for identities, terms, and common traps.",
      storageType: "db",
      sourceTag
    }
  });
  await prisma.flashcard.createMany({
    data: [
      { resourceId: flashcard.id, sequence: 1, question: "What is (a + b)^2?", answer: "a^2 + 2ab + b^2", sourceTag },
      { resourceId: flashcard.id, sequence: 2, question: "What is (a - b)^2?", answer: "a^2 - 2ab + b^2", sourceTag },
      { resourceId: flashcard.id, sequence: 3, question: "What should every algebra answer include?", answer: "Formula, substitution, calculation steps, and final statement.", sourceTag }
    ]
  });
  const quiz = await prisma.resource.create({
    data: {
      creatorProfileId: profileId,
      type: ResourceType.quiz,
      title: input.title + " diagnostic quiz",
      description: "Short MCQ check before moving to the next milestone.",
      storageType: "db",
      contentJson: {
        questions: [
          {
            id: "class-10-board-q1",
            prompt: "Which expression is equal to a^2 - b^2?",
            options: ["(a + b)(a - b)", "(a - b)^2", "a^2 + b^2", "2ab"],
            answerIndex: 0,
            learnMore: "Difference of squares factors into sum and difference terms."
          },
          {
            id: "class-10-board-q2",
            prompt: "What is the highest power in a linear equation?",
            options: ["1", "2", "3", "0"],
            answerIndex: 0,
            learnMore: "A linear equation has variables with highest power 1."
          }
        ]
      },
      sourceTag
    }
  });
  const program = await prisma.program.create({
    data: {
      creatorProfileId: profileId,
      role: Role.tutor,
      title: input.title,
      description: input.description,
      visibility: "published",
      status: "published",
      feeType: input.feeType,
      feeAmount: input.feeAmount,
      sourceTag,
      milestones: {
        create: {
          sequence: 1,
          title: input.milestoneTitle,
          sourceTag
        }
      }
    },
    include: { milestones: true }
  });
  const milestone = program.milestones[0];
  await prisma.milestoneActivity.createMany({
    data: [
      { milestoneId: milestone.id, resourceId: video.id, sequence: 1, type: ResourceType.video, title: video.title, description: video.description, sourceTag },
      { milestoneId: milestone.id, resourceId: article.id, sequence: 2, type: ResourceType.article, title: article.title, description: article.description, sourceTag },
      { milestoneId: milestone.id, resourceId: flashcard.id, sequence: 3, type: ResourceType.flashcard, title: flashcard.title, description: flashcard.description, sourceTag },
      { milestoneId: milestone.id, resourceId: quiz.id, sequence: 4, type: ResourceType.quiz, title: quiz.title, description: quiz.description, sourceTag }
    ]
  });
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
