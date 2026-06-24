import "dotenv/config";
import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { featureFlags, isFeatureEnabled } from "@mytution/config";
import { prisma } from "@mytution/db";
import type { ResourceType, Role } from "@mytution/shared";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const mockOtp = "123456";
const mobileClientId = "mytution_mobile_app";
const medicalProgramCatalog = [
  { id: "medical-neet-full-12", role: "student", title: "12 month NEET full course", description: "Full syllabus plan with monthly Biology, Chemistry, and Physics milestones", milestones: 12 },
  { id: "medical-neet-crash-90", role: "student", title: "NEET 90 day crash course", description: "High-intensity revision plan for high-yield chapters and mock practice", milestones: 6 },
  { id: "medical-biology-masterclass", role: "student", title: "NEET Biology masterclass", description: "Botany and Zoology focused program with NCERT recall drills", milestones: 8 },
  { id: "medical-chemistry-sprint", role: "student", title: "NEET Chemistry revision sprint", description: "Physical, Organic, and Inorganic Chemistry revision with quizzes", milestones: 6 },
  { id: "medical-physics-problem-solving", role: "student", title: "NEET Physics problem solving", description: "Mechanics, electrodynamics, optics, and modern physics practice", milestones: 8 },
  { id: "medical-aiims-nursing", role: "student", title: "AIIMS nursing entrance prep", description: "Medical aptitude, biology basics, and exam readiness milestones", milestones: 6 },
  { id: "medical-class-11-foundation", role: "student", title: "Class 11 medical foundation", description: "Early foundation for future NEET aspirants", milestones: 10 },
  { id: "medical-class-12-bridge", role: "student", title: "Class 12 board plus NEET bridge", description: "Board exam alignment with NEET-style topic practice", milestones: 8 }
] as const;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "myTution API", db: "connected" });
  } catch {
    res.status(503).json({ ok: false, service: "myTution API", db: "unavailable" });
  }
});

app.post("/api/v1/auth/register/start", async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  res.json({ data: { otpSent: true, otpHint: mockOtp } });
});

app.post("/api/v1/auth/register/verify", async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const role = readRole(req.body.role);
  const password = String(req.body.password ?? "");
  if (!phone || req.body.otp !== mockOtp || !isValidPassword(password)) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  const profileInput = req.body.profile ?? {};
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash: await hashPassword(password),
      profiles: {
        create: {
          role,
          firstName: String(profileInput.firstName ?? "New"),
          lastName: String(profileInput.lastName ?? "User"),
          dob: dateOrNull(profileInput.dob),
          city: stringOrNull(profileInput.city),
          communicationAddress: stringOrNull(profileInput.communicationAddress),
          alternatePhone: stringOrNull(profileInput.alternatePhone),
          avatarUrl: stringOrNull(profileInput.avatarUrl),
          stream: role === "parent" ? null : stringOrNull(profileInput.stream),
          specialization: role === "parent" ? null : stringOrNull(profileInput.specialization)
        }
      }
    },
    include: { profiles: true }
  });

  const profile = user.profiles[0];
  if (profile) {
    await prisma.userManagement.create({
      data: {
        userId: user.id,
        role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dob: profile.dob,
        city: profile.city,
        communicationAddress: profile.communicationAddress,
        alternatePhone: profile.alternatePhone,
        avatarUrl: profile.avatarUrl,
        stream: profile.stream,
        specialization: profile.specialization
      }
    });
  }

  const session = await createSession(user.id);
  res.status(201).json({ data: { userId: user.id, profileId: profile?.id, role, ...session } });
});

app.post("/api/v1/auth/login", async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password ?? "");
  const role = readRole(req.body.role);
  if (!phone || !password) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profiles: { where: { role }, take: 1 } }
  });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash)) || user.profiles.length === 0) {
    res.status(401).json({ error: "Something went wrong" });
    return;
  }

  const session = await createSession(user.id);
  res.json({ data: { userId: user.id, profileId: user.profiles[0]?.id, role, ...session } });
});

app.post("/api/v1/auth/refresh", async (req, res) => {
  const refreshToken = String(req.body.refreshToken ?? "");
  const session = await prisma.authSession.findUnique({ where: { refreshToken } });
  if (!session || session.revokedAt || session.refreshTokenExpiresAt < new Date()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });
  res.json({ data: await createSession(session.userId) });
});

app.post("/api/v1/auth/revoke", async (req, res) => {
  const bearer = readBearer(req.headers.authorization);
  const refreshToken = String(req.body.refreshToken ?? "");
  await prisma.authSession.updateMany({
    where: {
      OR: [{ accessToken: bearer }, { refreshToken }],
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
  res.status(204).send();
});

app.delete("/api/v1/admin/users/by-phone", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const phone = normalizePhone(req.body.phone ?? req.query.phone);
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profiles: { select: { id: true } } }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const profileIds = user.profiles.map((profile) => profile.id);
  const result = await prisma.$transaction(async (tx) => {
    const resourceProgress = await tx.resourceProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const programProgress = await tx.programProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const reminders = await tx.reminder.deleteMany({ where: { userId: user.id } });
    const userManagement = await tx.userManagement.deleteMany({ where: { userId: user.id } });
    const authSessions = await tx.authSession.deleteMany({ where: { userId: user.id } });
    const profiles = await tx.profile.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
    return {
      userId: user.id,
      phone,
      deleted: {
        authSessions: authSessions.count,
        reminders: reminders.count,
        userManagement: userManagement.count,
        resourceProgress: resourceProgress.count,
        programProgress: programProgress.count,
        profiles: profiles.count,
        users: 1
      }
    };
  });

  res.json({ data: result });
});

app.get("/api/v1/bootstrap", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  res.json({
    persona: profile ? toPersona(profile) : fallbackPersona(role),
    featureFlags,
    role
  });
});

app.get("/api/v1/usermanagement/profile", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findUserManagement(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ data: profile });
});

app.put("/api/v1/usermanagement/profile", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await readUserId(req);
  const current = await findProfile(role, userId);
  if (!current) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const data = {
    firstName: String(req.body.firstName ?? current.firstName),
    lastName: String(req.body.lastName ?? current.lastName),
    dob: dateOrNull(req.body.dob) ?? current.dob,
    city: stringOrNull(req.body.city) ?? current.city,
    communicationAddress: stringOrNull(req.body.communicationAddress) ?? current.communicationAddress,
    alternatePhone: stringOrNull(req.body.alternatePhone) ?? current.alternatePhone,
    avatarUrl: stringOrNull(req.body.avatarUrl) ?? current.avatarUrl,
    stream: role === "parent" ? null : stringOrNull(req.body.stream) ?? current.stream,
    specialization: role === "parent" ? null : stringOrNull(req.body.specialization) ?? current.specialization
  };

  const [profile, userManagement] = await prisma.$transaction([
    prisma.profile.update({ where: { id: current.id }, data }),
    prisma.userManagement.upsert({
      where: { userId_role: { userId: current.userId, role } },
      update: data,
      create: { userId: current.userId, role, ...data }
    })
  ]);

  res.json({ data: { profile, userManagement } });
});

app.get("/api/v1/recommendations", async (req, res) => {
  const role = readRole(req.query.role);
  if (!isFeatureEnabled("recommendations", role)) {
    res.json({ data: [] });
    return;
  }

  const data = await prisma.recommendation.findMany({
    where: { role },
    orderBy: { createdAt: "asc" }
  });
  res.json({ data: data.map(toRecommendation) });
});

app.get("/api/v1/events-reminders", async (req, res) => {
  const role = readRole(req.query.role);
  if (!isFeatureEnabled("eventsReminders", role)) {
    res.json({ data: [] });
    return;
  }
  const userId = await readUserId(req);
  res.json({ data: await listReminders(role, userId) });
});

app.post("/api/v1/events-reminders", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId: profile.userId,
      profileId: profile.id,
      role,
      title: String(req.body.title ?? "Untitled reminder"),
      startsAt: parseDate(req.body.startsAt),
      sourceTag: String(req.body.sourceTag ?? "app")
    }
  });
  res.status(201).json({ data: toReminder(reminder) });
});

app.patch("/api/v1/events-reminders/:id", async (req, res) => {
  const reminder = await prisma.reminder.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title ? String(req.body.title) : undefined,
      startsAt: req.body.startsAt ? parseDate(req.body.startsAt) : undefined
    }
  });
  res.json({ data: toReminder(reminder) });
});

app.delete("/api/v1/events-reminders/:id", async (req, res) => {
  await prisma.reminder.update({
    where: { id: req.params.id },
    data: { status: "cancelled" }
  });
  res.status(204).send();
});

app.get("/api/v1/reminders", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  res.json({ data: await listReminders(role, userId) });
});

app.post("/api/v1/reminders", async (req, res) => {
  req.url = "/api/v1/events-reminders";
  app._router.handle(req, res, () => undefined);
});

app.get("/api/v1/education-plan/current", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const plan = await getEducationPlan(role, userId, stringOrNull(req.query.programId));
  if (!plan) {
    res.status(404).json({ error: "Education plan not found" });
    return;
  }
  res.json({ data: plan });
});

app.get("/api/v1/education-plan/programs", async (req, res) => {
  const role = readRole(req.query.role);
  if (role === "student") {
    res.json({ data: medicalProgramCatalog.map(({ milestones: _milestones, ...program }) => program) });
    return;
  }
  const programs = await prisma.program.findMany({
    where: { role },
    orderBy: { title: "asc" },
    select: { id: true, role: true, title: true, description: true }
  });
  res.json({ data: programs });
});

app.get("/api/v1/programs/current", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const plan = await getEducationPlan(role, userId, stringOrNull(req.query.programId));
  if (!plan) {
    res.status(404).json({ error: "Program sessions disabled" });
    return;
  }
  res.json({ data: { title: plan.title, milestones: plan.milestones } });
});

app.get("/api/v1/resources/:id", async (req, res) => {
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: { flashcards: { orderBy: { sequence: "asc" } } }
  });
  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.json({ data: resource });
});

app.post("/api/v1/resources/:id/complete", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const progress = await prisma.resourceProgress.upsert({
    where: { profileId_resourceId: { profileId: profile.id, resourceId: req.params.id } },
    update: { status: "complete", completedAt: new Date() },
    create: {
      profileId: profile.id,
      resourceId: req.params.id,
      status: "complete",
      completedAt: new Date()
    }
  });
  res.json({ data: progress });
});

app.get("/api/v1/dis/dashboard", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const [reminders, plan, recommendations] = await Promise.all([
    listReminders(role, userId),
    getEducationPlan(role, userId, stringOrNull(req.query.programId)),
    prisma.recommendation.count({ where: { role } })
  ]);

  res.json({
    data: {
      role,
      cards: dashboardCards(role, reminders.length, plan?.completedMilestoneSequence ?? 0, recommendations),
      today: {
        title: role === "tutor" ? "Demo with Apoorv Gulati" : "Trial with Neha Verma",
        startsAt: "2026-06-24T12:30:00.000Z",
        mode: "Online",
        status: "Pending"
      }
    }
  });
});

app.get("/api/v1/payments/methods", (_req: express.Request, res: express.Response) => {
  res.json({
    data: [
      { id: "upi_1", type: "upi", label: "apoorv@upi" },
      { id: "card_1", type: "card", label: "Visa ending 4242" }
    ]
  });
});

async function createSession(userId: string) {
  const mobileClient = await prisma.mobileClient.upsert({
    where: { clientId: mobileClientId },
    update: { status: "active" },
    create: { clientId: mobileClientId, name: "myTution Mobile App", sourceTag: "app" }
  });
  const accessToken = `access_${crypto.randomBytes(32).toString("hex")}`;
  const refreshToken = `refresh_${crypto.randomBytes(32).toString("hex")}`;
  const accessTokenExpiresAt = addMinutes(15);
  const refreshTokenExpiresAt = addDays(30);
  await prisma.authSession.create({
    data: {
      userId,
      mobileClientId: mobileClient.id,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt
    }
  });
  return { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, tokenType: "Bearer" };
}

async function readUserId(req: express.Request) {
  const accessToken = readBearer(req.headers.authorization);
  if (!accessToken) return null;
  const session = await prisma.authSession.findUnique({ where: { accessToken } });
  if (!session || session.revokedAt || session.accessTokenExpiresAt < new Date()) return null;
  return session.userId;
}

async function findProfile(role: Role, userId?: string | null) {
  return prisma.profile.findFirst({
    where: { role, ...(userId ? { userId } : {}) },
    include: { user: true },
    orderBy: { createdAt: "asc" }
  });
}

async function findUserManagement(role: Role, userId?: string | null) {
  return prisma.userManagement.findFirst({
    where: { role, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "asc" }
  });
}

async function listReminders(role: Role, userId?: string | null) {
  const reminders = await prisma.reminder.findMany({
    where: { role, status: "active", ...(userId ? { userId } : {}) },
    orderBy: { startsAt: "asc" }
  });
  return reminders.map(toReminder);
}

async function getEducationPlan(role: Role, userId?: string | null, programId?: string | null) {
  if (!isFeatureEnabled("programSessions", role)) return null;
  const scopedProfile = userId ? await findProfile(role, userId) : null;
  const program = await prisma.program.findFirst({
    where: { role, ...(programId ? { id: programId } : {}) },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
        include: {
          activities: {
            orderBy: { sequence: "asc" }
          }
        }
      },
      progress: true
    }
  });
  if (!program) return fallbackEducationPlan(role, programId);
  const progress = scopedProfile
    ? program.progress.find((item) => item.profileId === scopedProfile.id)
    : null;
  const unlocked = progress?.unlockedMilestoneSequence ?? 1;
  const completed = progress?.completedMilestoneSequence ?? 0;
  return {
    id: program.id,
    role: program.role,
    title: program.title,
    description: program.description,
    unlockedMilestoneSequence: unlocked,
    completedMilestoneSequence: completed,
    milestones: program.milestones.map((milestone) => ({
      id: milestone.id,
      sequence: milestone.sequence,
      title: milestone.title,
      locked: milestone.sequence > unlocked,
      resources: milestone.activities.map((activity) => activity.type as ResourceType),
      activities: milestone.activities.map((activity) => ({
        id: activity.id,
        resourceId: activity.resourceId,
        sequence: activity.sequence,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        status: activity.status
      }))
    }))
  };
}

function dashboardCards(role: Role, reminderCount: number, completedMilestones: number, recommendationCount: number) {
  if (role === "tutor") {
    return [
      { value: "0", label: "Students", target: "roleHub" },
      { value: "0", label: "Leads", target: "search" },
      { value: "0", label: "Rating", target: "ratings" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  if (role === "parent") {
    return [
      { value: "0", label: "Surveys", target: "roleHub" },
      { value: "0%", label: "Progress", target: "sessions" },
      { value: String(recommendationCount), label: "Smart picks", target: "home" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  return [
    { value: "0", label: "Sessions", target: "sessions" },
    { value: String(completedMilestones), label: "Completed", target: "sessions" },
    { value: String(recommendationCount), label: "Smart picks", target: "home" },
    { value: String(reminderCount), label: "Reminders", target: "events" }
  ];
}

function fallbackEducationPlan(role: Role, programId?: string | null) {
  if (role !== "student") return null;
  const program = medicalProgramCatalog.find((item) => item.id === programId) ?? medicalProgramCatalog[0];
  return {
    id: program.id,
    role: program.role,
    title: program.title,
    description: program.description,
    unlockedMilestoneSequence: 1,
    completedMilestoneSequence: 0,
    milestones: Array.from({ length: program.milestones }).map((_, index) => {
      const sequence = index + 1;
      return {
        id: `${program.id}-milestone-${sequence}`,
        sequence,
        title: `${program.title.split(" ")[0]} milestone ${sequence}`,
        locked: sequence > 1,
        resources: ["video", "article", "flashcard", "quiz"] as ResourceType[],
        activities: [
          { id: `${program.id}-m${sequence}-video`, resourceId: `${program.id}-video`, sequence: 1, type: "video", title: "Watch topic video", description: "Concept lesson with examples", status: sequence === 1 ? "in_progress" : "pending" },
          { id: `${program.id}-m${sequence}-article`, resourceId: `${program.id}-article`, sequence: 2, type: "article", title: "Read topic notes", description: "NCERT-aligned notes and summary", status: "pending" },
          { id: `${program.id}-m${sequence}-flashcard`, resourceId: `${program.id}-flashcard`, sequence: 3, type: "flashcard", title: "Practice flashcards", description: "Rapid recall cards", status: "pending" },
          { id: `${program.id}-m${sequence}-quiz`, resourceId: `${program.id}-quiz`, sequence: 4, type: "quiz", title: "Complete quiz", description: "Exam-style practice", status: "pending" }
        ]
      };
    })
  };
}

function toPersona(profile: Awaited<ReturnType<typeof findProfile>>) {
  if (!profile) return fallbackPersona("student");
  return {
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    initials: `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    phone: profile.user.phone,
    profileLabel: profile.role === "parent"
      ? `Parent • Apoorv Gulati • Class 10`
      : `${capitalize(profile.role)} • ${profile.stream ?? "Senior"} • ${profile.specialization ?? "myTution"}`
  };
}

function fallbackPersona(role: Role) {
  return {
    role,
    firstName: role === "tutor" ? "Ankit" : role === "parent" ? "Sarmishtha" : "Apoorv",
    lastName: role === "tutor" ? "Sharma" : "Gulati",
    initials: role === "tutor" ? "AS" : role === "parent" ? "SG" : "AG",
    phone: "",
    profileLabel: `${capitalize(role)} • myTution`
  };
}

function toRecommendation(item: {
  id: string;
  role: string;
  type: string;
  title: string;
  description: string;
  thumbnailLabel: string;
}) {
  return {
    id: item.id,
    role: item.role,
    type: item.type,
    title: item.title,
    description: item.description,
    thumbnailLabel: item.thumbnailLabel
  };
}

function toReminder(item: {
  id: string;
  role: string;
  title: string;
  startsAt: Date;
  status: string;
}) {
  return {
    id: item.id,
    role: item.role,
    title: item.title,
    startsAt: item.startsAt.toISOString(),
    status: item.status
  };
}

function readRole(input: unknown): Role {
  return input === "tutor" || input === "parent" || input === "student" ? input : "student";
}

function normalizePhone(input: unknown) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("91") ? `+${digits}` : `+91${digits.slice(-10)}`;
}

function parseDate(input: unknown) {
  const value = String(input ?? "");
  const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)$/);
  if (slashMatch) {
    const [, day, month, year, time] = slashMatch;
    return new Date(`${year}-${month}-${day} ${time}`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function dateOrNull(input: unknown) {
  const value = String(input ?? "").trim();
  if (!value) return null;
  const dateOnly = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function stringOrNull(input: unknown) {
  const value = String(input ?? "").trim();
  return value ? value : null;
}

function readBearer(header: unknown) {
  const value = String(header ?? "");
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function isValidPassword(password: string) {
  return password.length >= 8;
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, keyHex] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, salt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function scryptAsync(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

function isAdminRequest(req: express.Request) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  return Boolean(adminToken && req.header("x-admin-token") === adminToken);
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

app.listen(port, () => {
  console.log(`myTution API running on http://localhost:${port}`);
});
