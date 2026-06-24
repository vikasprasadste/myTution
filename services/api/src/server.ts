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
  if (!phone || req.body.otp !== mockOtp) {
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
      profiles: {
        create: {
          role,
          firstName: String(profileInput.firstName ?? "New"),
          lastName: String(profileInput.lastName ?? "User"),
          city: stringOrNull(profileInput.city),
          communicationAddress: stringOrNull(profileInput.communicationAddress),
          alternatePhone: stringOrNull(profileInput.alternatePhone),
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
        city: profile.city,
        communicationAddress: profile.communicationAddress,
        alternatePhone: profile.alternatePhone,
        stream: profile.stream,
        specialization: profile.specialization
      }
    });
  }

  const session = await createSession(user.id);
  res.status(201).json({ data: { userId: user.id, profileId: profile?.id, role, ...session } });
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

app.get("/api/v1/bootstrap", async (req, res) => {
  const role = readRole(req.query.role);
  const profile = await findProfile(role);
  res.json({
    persona: profile ? toPersona(profile) : fallbackPersona(role),
    featureFlags,
    role
  });
});

app.get("/api/v1/usermanagement/profile", async (req, res) => {
  const role = readRole(req.query.role);
  const profile = await findUserManagement(role);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ data: profile });
});

app.put("/api/v1/usermanagement/profile", async (req, res) => {
  const role = readRole(req.body.role);
  const current = await findProfile(role);
  if (!current) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const data = {
    firstName: String(req.body.firstName ?? current.firstName),
    lastName: String(req.body.lastName ?? current.lastName),
    city: stringOrNull(req.body.city) ?? current.city,
    communicationAddress: stringOrNull(req.body.communicationAddress) ?? current.communicationAddress,
    alternatePhone: stringOrNull(req.body.alternatePhone) ?? current.alternatePhone,
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
  res.json({ data: await listReminders(role) });
});

app.post("/api/v1/events-reminders", async (req, res) => {
  const role = readRole(req.body.role);
  const profile = await findProfile(role);
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
  res.json({ data: await listReminders(role) });
});

app.post("/api/v1/reminders", async (req, res) => {
  req.url = "/api/v1/events-reminders";
  app._router.handle(req, res, () => undefined);
});

app.get("/api/v1/education-plan/current", async (req, res) => {
  const role = readRole(req.query.role);
  const plan = await getEducationPlan(role);
  if (!plan) {
    res.status(404).json({ error: "Education plan not found" });
    return;
  }
  res.json({ data: plan });
});

app.get("/api/v1/programs/current", async (req, res) => {
  const role = readRole(req.query.role);
  const plan = await getEducationPlan(role);
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
  const profile = await findProfile(role);
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
  const [reminders, plan, recommendations] = await Promise.all([
    listReminders(role),
    getEducationPlan(role),
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

async function findProfile(role: Role) {
  return prisma.profile.findFirst({
    where: { role },
    include: { user: true },
    orderBy: [{ sourceTag: "desc" }, { createdAt: "asc" }]
  });
}

async function findUserManagement(role: Role) {
  return prisma.userManagement.findFirst({
    where: { role },
    orderBy: [{ sourceTag: "desc" }, { createdAt: "asc" }]
  });
}

async function listReminders(role: Role) {
  const reminders = await prisma.reminder.findMany({
    where: { role, status: "active" },
    orderBy: { startsAt: "asc" }
  });
  return reminders.map(toReminder);
}

async function getEducationPlan(role: Role) {
  if (!isFeatureEnabled("programSessions", role)) return null;
  const program = await prisma.program.findFirst({
    where: { role },
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
  if (!program) return null;
  const progress = program.progress[0];
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
      { value: "3", label: "Leads", target: "search" },
      { value: "8.2k", label: "Payouts", target: "payments" },
      { value: "4.9", label: "Rating", target: "ratings" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  if (role === "parent") {
    return [
      { value: "86%", label: "Progress", target: "sessions" },
      { value: "199", label: "Payments", target: "payments" },
      { value: String(recommendationCount), label: "Smart picks", target: "home" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  return [
    { value: "12", label: "Sessions", target: "sessions" },
    { value: String(completedMilestones), label: "Completed", target: "sessions" },
    { value: String(recommendationCount), label: "Smart picks", target: "home" },
    { value: String(reminderCount), label: "Reminders", target: "events" }
  ];
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

function stringOrNull(input: unknown) {
  const value = String(input ?? "").trim();
  return value ? value : null;
}

function readBearer(header: unknown) {
  const value = String(header ?? "");
  return value.startsWith("Bearer ") ? value.slice(7) : "";
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
