import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { featureFlags, isFeatureEnabled, paletteConfig, roleThemes } from "@mytution/config";
import { prisma } from "@mytution/db";
import type { CommunityReactionType, MarketplaceBatchRecommendation, MarketplaceProgramRecommendation, ProgramSummary, ResourceType, Role, TutorProgramCreateInput, TutorProgramResourceInput } from "@mytution/shared";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const assetsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const mockOtp = "123456";
const mobileClientId = "mytution_mobile_app";

function isMissingParentLinkTable(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
  const table = typeof error === "object" && error !== null && "meta" in error ? (error as { meta?: { table?: string } }).meta?.table : undefined;
  return code === "P2021" && (table === "public.ParentActivationCode" || table === "public.ParentStudentLink");
}

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

type QuizQuestion = { id: string; prompt: string; options: string[]; answerIndex: number; learnMore: string };

const motionFlashcardDeck = [
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

const quizQuestionBank: QuizQuestion[] = [
  {
    id: "neet-foundation-q1",
    prompt: "Which practice best builds conceptual clarity after a short lesson?",
    options: ["Only rereading the title", "Writing a quick summary and solving checks", "Skipping the notes", "Changing to another topic immediately"],
    answerIndex: 1,
    learnMore: "A summary plus quick checks turns passive watching into active recall and exposes gaps early."
  },
  {
    id: "neet-foundation-q2",
    prompt: "Why are labelled diagrams important in Biology preparation?",
    options: ["They are rarely tested", "They support recall of structure and function", "They replace definitions", "They only help in Chemistry"],
    answerIndex: 1,
    learnMore: "NEET and board questions often test diagram labels, functions, and relationships together."
  },
  {
    id: "neet-foundation-q3",
    prompt: "What is the purpose of a diagnostic quiz before the next milestone unlocks?",
    options: ["To check readiness", "To delete old progress", "To skip revision", "To choose a tutor gender"],
    answerIndex: 0,
    learnMore: "The diagnostic confirms whether the learner has enough clarity to move ahead confidently."
  },
  {
    id: "neet-foundation-q4",
    prompt: "Which method is best for memorising formulas, reactions, and definitions?",
    options: ["Active recall with flashcards", "Watching one long lecture only", "Avoiding practice", "Reading without testing"],
    answerIndex: 0,
    learnMore: "Flashcards force retrieval, which strengthens memory more than simply rereading."
  },
  {
    id: "neet-foundation-q5",
    prompt: "What makes board-style subjective answers stronger?",
    options: ["Only the final line", "Clear steps, keywords, units, and diagrams", "Leaving out workings", "Writing unrelated facts"],
    answerIndex: 1,
    learnMore: "Marking schemes reward structured reasoning and expected keywords, not just the final answer."
  }
];

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/v1/ams/files", express.static(assetsRoot));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "myTution API" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

type AssetKind = "thumbnail" | "banner" | "vtt" | "metadata";

function toAssetUrl(assetPath?: string | null) {
  if (!assetPath) return null;
  return `/api/v1/ams/files/${assetPath.replace(/^services\/api\/assets\//, "")}`;
}

function readMediaUrl(contentJson?: unknown) {
  if (!contentJson || typeof contentJson !== "object" || !("mediaUrl" in contentJson)) return null;
  const mediaUrl = contentJson.mediaUrl;
  return typeof mediaUrl === "string" ? mediaUrl : null;
}

const defaultAssetPathsByType: Record<string, { thumbnailPath: string; bannerPath: string; vttPath?: string; metadataPath: string }> = {
  video: {
    thumbnailPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/thumbnail.svg",
    bannerPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/banner.svg",
    vttPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/captions.vtt",
    metadataPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/title-description.md"
  },
  article: {
    thumbnailPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/thumbnail.svg",
    bannerPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/banner.svg",
    metadataPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/title-description.md"
  },
  flashcard: {
    thumbnailPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/thumbnail.svg",
    bannerPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/banner.svg",
    metadataPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/title-description.md"
  },
  quiz: {
    thumbnailPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/thumbnail.svg",
    bannerPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/banner.svg",
    metadataPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/title-description.md"
  }
};

type ResourceAssetShape = {
  id?: string | null;
  assetProvider?: string | null;
  accessLevel?: string | null;
  assetVersion?: string | null;
  storageType?: string | null;
  assetSlug?: string | null;
  type?: string | null;
  thumbnailPath?: string | null;
  bannerPath?: string | null;
  vttPath?: string | null;
  metadataPath?: string | null;
  contentJson?: unknown;
};

function assetPathForKind(resource: ResourceAssetShape | null | undefined, kind: AssetKind) {
  if (!resource) return null;
  const defaults = resource.type ? defaultAssetPathsByType[resource.type] : undefined;
  if (kind === "thumbnail") return resource.thumbnailPath ?? defaults?.thumbnailPath ?? null;
  if (kind === "banner") return resource.bannerPath ?? defaults?.bannerPath ?? null;
  if (kind === "vtt") return resource.vttPath ?? defaults?.vttPath ?? null;
  return resource.metadataPath ?? defaults?.metadataPath ?? null;
}

function toPrivateAssetUrl(resource: ResourceAssetShape, kind: AssetKind, options?: { private?: boolean; role?: Role; accessToken?: string | null }) {
  const assetPath = assetPathForKind(resource, kind);
  if (!assetPath) return null;
  if (!options?.private || !("id" in resource) || typeof resource.id !== "string") return toAssetUrl(assetPath);
  const params = new URLSearchParams();
  if (options.role) params.set("role", options.role);
  if (options.accessToken) params.set("accessToken", options.accessToken);
  const query = params.toString();
  return `/api/v1/ams/assets/${resource.id}/file/${kind}${query ? `?${query}` : ""}`;
}

function assetUrlsFor(resource?: ResourceAssetShape | null, options?: { private?: boolean; role?: Role; accessToken?: string | null }) {
  if (!resource) {
    return { thumbnail: null, banner: null, vtt: null, metadata: null, media: null };
  }
  return {
    thumbnail: toPrivateAssetUrl(resource, "thumbnail", options),
    banner: toPrivateAssetUrl(resource, "banner", options),
    vtt: toPrivateAssetUrl(resource, "vtt", options),
    metadata: toPrivateAssetUrl(resource, "metadata", options),
    media: readMediaUrl(resource.contentJson)
  };
}

function assetMetadataFor(resource: ResourceAssetShape, entitlement?: { entitled?: boolean; readonly?: boolean; role?: Role; accessToken?: string | null }) {
  return {
    provider: resource.assetProvider ?? "repo",
    accessLevel: resource.accessLevel ?? "program",
    version: resource.assetVersion ?? "v1",
    storageType: resource.storageType ?? "db",
    assetSlug: resource.assetSlug ?? null,
    entitled: entitlement?.entitled ?? true,
    readonly: entitlement?.readonly ?? false,
    urls: assetUrlsFor(resource, { private: true, role: entitlement?.role, accessToken: entitlement?.accessToken })
  };
}

function withAssetUrls<T extends ResourceAssetShape>(resource: T, entitlement?: { entitled?: boolean; readonly?: boolean; role?: Role; accessToken?: string | null }) {
  return {
    ...resource,
    assetUrls: assetUrlsFor(resource, { private: true, role: entitlement?.role, accessToken: entitlement?.accessToken }),
    assetMetadata: assetMetadataFor(resource, entitlement)
  };
}

function hasPlaceholderFlashcards(resource: { type?: string | null; flashcards?: Array<{ question: string; answer: string }> }) {
  if (resource.type !== "flashcard") return false;
  if (!resource.flashcards?.length) return true;
  return resource.flashcards.some((card) => {
    const value = `${card.question} ${card.answer}`.toLowerCase();
    return /question\s*\d+/.test(value) || /answer\s*\d+/.test(value) || value.includes("quadratic question");
  });
}

function withFlashcardFallback<T extends { id: string; type?: string | null; title?: string; description?: string; flashcards?: Array<{ id?: string; resourceId?: string; sequence: number; question: string; answer: string; relatedArticleId?: string | null; sourceTag?: string }> }>(resource: T) {
  if (!hasPlaceholderFlashcards(resource)) return resource;
  return {
    ...resource,
    title: "Motion active recall cards",
    description: "10 flashcards for one-dimensional motion definitions, units, and graphs.",
    flashcards: motionFlashcardDeck.map(([question, answer], index) => ({
      id: `${resource.id}-fallback-card-${index + 1}`,
      resourceId: resource.id,
      sequence: index + 1,
      question,
      answer,
      relatedArticleId: null,
      sourceTag: "mock"
    }))
  };
}

function normalizeTutorProgramInput(body: unknown): TutorProgramCreateInput {
  const input = (body ?? {}) as Partial<TutorProgramCreateInput>;
  const legacyResources = Array.isArray(input.resources)
    ? input.resources.map(normalizeTutorResourceInput).filter((item): item is TutorProgramResourceInput => Boolean(item))
    : [];
  const milestones = Array.isArray(input.milestones)
    ? input.milestones.map((milestone, index) => {
      const resources = Array.isArray(milestone.resources)
        ? milestone.resources.map(normalizeTutorResourceInput).filter((item): item is TutorProgramResourceInput => Boolean(item))
        : [];
      return {
        title: String(milestone.title ?? "").trim(),
        sequence: Math.max(1, Number(milestone.sequence ?? index + 1) || index + 1),
        resources
      };
    }).filter((milestone) => milestone.title && milestone.resources.length)
    : [];
  return {
    title: String(input.title ?? "").trim(),
    description: String(input.description ?? "").trim(),
    milestoneTitle: String(input.milestoneTitle ?? "").trim(),
    visibility: input.visibility === "private" ? "private" : "published",
    feeType: input.feeType === "paid" ? "paid" : "free",
    feeAmount: input.feeType === "paid" ? Number(input.feeAmount ?? 0) || 0 : null,
    resources: legacyResources,
    milestones: milestones.length ? milestones : legacyResources.length ? [{
      title: String(input.milestoneTitle ?? "").trim(),
      sequence: 1,
      resources: legacyResources
    }] : []
  };
}

function normalizeTutorResourceInput(resource: unknown): TutorProgramResourceInput | null {
  const input = (resource ?? {}) as Partial<TutorProgramResourceInput>;
  const type = input.type;
  if (!type || !["article", "video", "flashcard", "quiz"].includes(type)) return null;
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!title || !description) return null;
  const quizQuestions = Array.isArray(input.quizQuestions)
    ? input.quizQuestions.map((question, index) => {
      const options = Array.isArray(question.options) ? question.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4) : [];
      return {
        prompt: String(question.prompt ?? "").trim(),
        options: options.length >= 2 ? options : ["Option A", "Option B", "Option C", "Option D"],
        answerIndex: Math.min(Math.max(Number(question.answerIndex ?? 0), 0), Math.max(options.length - 1, 0)),
        learnMore: String(question.learnMore ?? "").trim() || `Review ${title} and try again.`
      };
    }).filter((question) => question.prompt)
    : [];
  return {
    type,
    title,
    description,
    body: String(input.body ?? "").trim(),
    mediaUrl: String(input.mediaUrl ?? "").trim(),
    assetSlug: String(input.assetSlug ?? "").trim(),
    assetProvider: String(input.assetProvider ?? "repo").trim(),
    accessLevel: String(input.accessLevel ?? "program").trim(),
    assetVersion: String(input.assetVersion ?? "v1").trim(),
    storageType: String(input.storageType ?? "db").trim(),
    thumbnailPath: String(input.thumbnailPath ?? "").trim(),
    bannerPath: String(input.bannerPath ?? "").trim(),
    vttPath: String(input.vttPath ?? "").trim(),
    metadataPath: String(input.metadataPath ?? "").trim(),
    flashcards: Array.isArray(input.flashcards)
      ? input.flashcards.map((card) => ({ question: String(card.question ?? "").trim(), answer: String(card.answer ?? "").trim() })).filter((card) => card.question && card.answer)
      : undefined,
    quizQuestions
  };
}

function defaultTutorFlashcards(title: string) {
  return [
    { question: `What is the core idea in ${title}?`, answer: "Identify the definition, formula, or key process before solving examples." },
    { question: `What should students recall first for ${title}?`, answer: "Recall the main terms, units, and exam keywords connected to this topic." },
    { question: `How should students revise ${title}?`, answer: "Use active recall, solve one example, and write a short summary in their own words." }
  ];
}

function tutorResourceData(input: TutorProgramResourceInput, tutorId: string) {
  const mediaUrl = input.mediaUrl || "";
  return {
    creatorProfileId: tutorId,
    type: input.type,
    title: input.title,
    description: input.description,
    body: input.body || input.description,
    assetSlug: input.assetSlug || null,
    assetProvider: input.assetProvider || "repo",
    accessLevel: input.accessLevel || "program",
    assetVersion: input.assetVersion || "v1",
    storageType: input.storageType || "db",
    thumbnailPath: input.thumbnailPath || null,
    bannerPath: input.bannerPath || null,
    vttPath: input.vttPath || null,
    metadataPath: input.metadataPath || null,
    sourceUrl: mediaUrl || null,
    contentJson: input.type === "quiz" ? {
      questions: (input.quizQuestions ?? []).map((question, questionIndex) => ({
        id: `q${questionIndex + 1}`,
        prompt: question.prompt,
        options: question.options,
        answerIndex: question.answerIndex,
        learnMore: question.learnMore ?? "Review the linked notes and try the concept again."
      }))
    } : mediaUrl ? { mediaUrl } : {},
    sourceTag: "app"
  };
}

async function writeResourceFlashcards(tx: any, resourceId: string, input: TutorProgramResourceInput) {
  if (input.type !== "flashcard") return;
  const cards = (input.flashcards?.length ? input.flashcards : defaultTutorFlashcards(input.title)).map((card, cardIndex) => ({
    resourceId,
    sequence: cardIndex + 1,
    question: card.question,
    answer: card.answer,
    sourceTag: "app"
  }));
  await tx.flashcard.createMany({ data: cards });
}

function toTutorResourceSummary(resource: any) {
  const questions = Array.isArray(resource.contentJson?.questions) ? resource.contentJson.questions : [];
  const usageCount = resource.milestoneActivities?.length ?? 0;
  const publishedUsageCount = resource.milestoneActivities?.filter((activity: any) => activity.milestone?.program?.status === "published").length ?? 0;
  return {
    id: resource.id,
    type: resource.type,
    title: resource.title,
    description: resource.description,
    body: resource.body,
    sourceUrl: resource.sourceUrl,
    assetUrls: assetUrlsFor(resource, { private: true }),
    assetMetadata: assetMetadataFor(resource, { entitled: true, readonly: publishedUsageCount > 0 }),
    flashcardCount: resource.flashcards?.length ?? 0,
    quizQuestionCount: questions.length,
    usageCount,
    publishedUsageCount,
    createdAt: resource.createdAt.toISOString()
  };
}

async function resourcePublishedUsageCount(resourceId: string) {
  return prisma.milestoneActivity.count({
    where: { resourceId, milestone: { program: { status: "published" } } }
  });
}

async function resourceUsageCount(resourceId: string) {
  return prisma.milestoneActivity.count({ where: { resourceId } });
}

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
  const activationCode = String(req.body.activationCode ?? "").replace(/\D/g, "").slice(0, 6);
  let activation = null;
  if (role === "parent") {
    try {
      activation = await prisma.parentActivationCode.findFirst({
        where: {
          code: activationCode,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
        }
      });
    } catch (error) {
      if (!isMissingParentLinkTable(error)) throw error;
    }
  }
  if (role === "parent" && !activation) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

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
    if (role === "parent" && activation) {
      await prisma.parentStudentLink.upsert({
        where: { studentProfileId_parentProfileId: { studentProfileId: activation.studentProfileId, parentProfileId: profile.id } },
        update: { status: "active", relationship: activation.relationship },
        create: { studentProfileId: activation.studentProfileId, parentProfileId: profile.id, relationship: activation.relationship, sourceTag: "app" }
      });
      await prisma.parentActivationCode.update({
        where: { id: activation.id },
        data: { status: "accepted", acceptedAt: new Date(), parentProfileId: profile.id }
      });
      await logAudit({
        userId: user.id,
        profileId: profile.id,
        role,
        action: "parent.student_link.accepted",
        entityType: "ParentStudentLink",
        metadata: { studentProfileId: activation.studentProfileId, relationship: activation.relationship }
      });
    }
  }

  const session = await createSession(user.id);
  await logAudit({
    userId: user.id,
    profileId: profile?.id,
    role,
    action: "auth.register",
    entityType: "User",
    entityId: user.id
  });
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
  await logAudit({
    userId: user.id,
    profileId: user.profiles[0]?.id,
    role,
    action: "auth.login",
    entityType: "User",
    entityId: user.id
  });
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

app.get("/api/v1/identity/me", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const requestedRole = req.query.role ? readRole(req.query.role) : null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profiles: {
        orderBy: { createdAt: "asc" },
        include: {
          tutorProfile: true,
          studentParentLinks: {
            where: { status: "active" },
            include: { parentProfile: { include: { user: true } } }
          },
          parentStudentLinks: {
            where: { status: "active" },
            include: { studentProfile: { include: { user: true } } }
          }
        }
      }
    }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const profiles = user.profiles.map(toIdentityProfile);
  const activeProfile = profiles.find((profile) => requestedRole && profile.role === requestedRole) ?? profiles[0] ?? null;
  res.json({
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      activeProfile,
      profiles,
      permissions: activeProfile ? permissionsForRole(activeProfile.role) : []
    }
  });
});

app.get("/api/v1/identity/linked-children", async (req, res) => {
  const parent = await requireProfile(req, res, "parent");
  if (!parent) return;
  const links = await prisma.parentStudentLink.findMany({
    where: { parentProfileId: parent.id, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { studentProfile: { include: { user: true } } }
  });
  res.json({
    data: links.map((link) => ({
      id: link.id,
      relationship: link.relationship,
      status: link.status,
      profileId: link.studentProfileId,
      userId: link.studentProfile.userId,
      phone: link.studentProfile.user.phone,
      name: `${link.studentProfile.firstName} ${link.studentProfile.lastName}`.trim(),
      stream: link.studentProfile.stream,
      specialization: link.studentProfile.specialization
    }))
  });
});

app.put("/api/v1/identity/student-education-profile", async (req, res) => {
  const profile = await requireProfile(req, res, "student");
  if (!profile) return;
  const data = {
    stream: stringOrNull(req.body.stream) ?? profile.stream,
    specialization: stringOrNull(req.body.specialization) ?? profile.specialization,
    city: stringOrNull(req.body.city) ?? profile.city
  };
  const updated = await prisma.profile.update({ where: { id: profile.id }, data });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "student",
    action: "student.education_profile.update",
    entityType: "Profile",
    entityId: profile.id
  });
  res.json({ data: updated });
});

app.put("/api/v1/identity/tutor-profile", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { profileId: profile.id },
    update: {
      headline: String(req.body.headline ?? ""),
      subjects: csvString(req.body.subjects),
      boards: csvString(req.body.boards),
      grades: csvString(req.body.grades),
      languages: csvString(req.body.languages),
      mode: csvString(req.body.mode),
      experienceYears: Number(req.body.experienceYears ?? 0) || 0,
      hourlyRate: Number(req.body.hourlyRate ?? 0) || 0,
      gender: String(req.body.gender ?? ""),
      location: String(req.body.location ?? ""),
      bio: String(req.body.bio ?? "")
    },
    create: {
      profileId: profile.id,
      headline: String(req.body.headline ?? ""),
      subjects: csvString(req.body.subjects),
      boards: csvString(req.body.boards),
      grades: csvString(req.body.grades),
      languages: csvString(req.body.languages),
      mode: csvString(req.body.mode),
      experienceYears: Number(req.body.experienceYears ?? 0) || 0,
      rating: 0,
      hourlyRate: Number(req.body.hourlyRate ?? 0) || 0,
      gender: String(req.body.gender ?? ""),
      location: String(req.body.location ?? ""),
      bio: String(req.body.bio ?? ""),
      sourceTag: "app"
    }
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.profile.update",
    entityType: "TutorProfile",
    entityId: tutorProfile.id
  });
  res.json({ data: tutorProfile });
});

app.get("/api/v1/tutor/supply", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { profileId: profile.id },
    include: {
      batches: {
        orderBy: { startsAt: "asc" },
        include: { requests: true, enrollments: true, program: true }
      }
    }
  });
  const programs = await prisma.program.findMany({
    where: { creatorProfileId: profile.id, role: "tutor" },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: { milestones: { include: { activities: true } } }
  });
  const analytics = tutorProfile ? await buildTutorSupplyAnalytics(profile.id, tutorProfile.id) : emptyTutorSupplyAnalytics();
  res.json({
    data: {
      profile: toIdentityProfile({ ...profile, tutorProfile, studentParentLinks: [], parentStudentLinks: [] }),
      programs: programs.map(tutorProgramSummary),
      batches: tutorProfile?.batches.map((batch) => toBatchSummary(batch)) ?? [],
      analytics
    }
  });
});

app.get("/api/v1/tutor/supply/analytics", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
  if (!tutorProfile) {
    res.json({ data: emptyTutorSupplyAnalytics() });
    return;
  }
  res.json({ data: await buildTutorSupplyAnalytics(profile.id, tutorProfile.id) });
});

app.get("/api/v1/tutor/resources", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const resources = await prisma.resource.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      flashcards: { orderBy: { sequence: "asc" } },
      milestoneActivities: { include: { milestone: { include: { program: true } } } }
    }
  });
  res.json({ data: resources.map(toTutorResourceSummary) });
});

app.post("/api/v1/tutor/resources", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const input = normalizeTutorResourceInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Valid resource type, title, and description are required" });
    return;
  }
  const resource = await prisma.$transaction(async (tx) => {
    const created = await tx.resource.create({
      data: tutorResourceData(input, profile.id)
    });
    await writeResourceFlashcards(tx, created.id, input);
    return tx.resource.findUnique({
      where: { id: created.id },
      include: {
        flashcards: { orderBy: { sequence: "asc" } },
        milestoneActivities: { include: { milestone: { include: { program: true } } } }
      }
    });
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.resource.create",
    entityType: "Resource",
    entityId: resource?.id
  });
  res.status(201).json({ data: toTutorResourceSummary(resource) });
});

app.put("/api/v1/tutor/resources/:id", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const existing = await prisma.resource.findFirst({ where: { id: req.params.id, creatorProfileId: profile.id } });
  if (!existing) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  if (await resourcePublishedUsageCount(existing.id)) {
    res.status(409).json({ error: "Published program content is view-only. Create a new resource version instead." });
    return;
  }
  const input = normalizeTutorResourceInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Valid resource type, title, and description are required" });
    return;
  }
  const resource = await prisma.$transaction(async (tx) => {
    await tx.flashcard.deleteMany({ where: { resourceId: existing.id } });
    const updated = await tx.resource.update({
      where: { id: existing.id },
      data: tutorResourceData(input, profile.id)
    });
    await writeResourceFlashcards(tx, updated.id, input);
    return tx.resource.findUnique({
      where: { id: updated.id },
      include: {
        flashcards: { orderBy: { sequence: "asc" } },
        milestoneActivities: { include: { milestone: { include: { program: true } } } }
      }
    });
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.resource.update",
    entityType: "Resource",
    entityId: existing.id
  });
  res.json({ data: toTutorResourceSummary(resource) });
});

app.delete("/api/v1/tutor/resources/:id", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const existing = await prisma.resource.findFirst({ where: { id: req.params.id, creatorProfileId: profile.id } });
  if (!existing) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  if (await resourcePublishedUsageCount(existing.id)) {
    res.status(409).json({ error: "Published program content cannot be deleted" });
    return;
  }
  if (await resourceUsageCount(existing.id)) {
    res.status(409).json({ error: "Detach this resource from draft program milestones before deleting it" });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.flashcard.deleteMany({ where: { resourceId: existing.id } });
    await tx.resource.delete({ where: { id: existing.id } });
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.resource.delete",
    entityType: "Resource",
    entityId: existing.id
  });
  res.status(204).send();
});

app.get("/api/v1/tutor/batches", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
  if (!tutorProfile) {
    res.json({ data: [] });
    return;
  }
  const batches = await prisma.tutorBatch.findMany({
    where: { tutorProfileId: tutorProfile.id, status: { not: "archived" } },
    orderBy: { startsAt: "asc" },
    include: { requests: true, enrollments: true, program: true }
  });
  res.json({ data: batches.map((batch) => toBatchSummary(batch)) });
});

app.post("/api/v1/tutor/batches", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
  if (!tutorProfile) {
    res.status(400).json({ error: "Tutor profile is required before creating batches" });
    return;
  }
  const programId = stringOrNull(req.body.programId);
  if (programId && !(await tutorOwnsProgram(profile.id, programId))) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const data = normalizeTutorBatchInput(req.body, tutorProfile.id, programId);
  if (!data.title || !data.course || !data.subject || !data.grade || !data.board || !data.schedule) {
    res.status(400).json({ error: "Batch title, course, subject, grade, board, and schedule are required" });
    return;
  }
  const batch = await prisma.tutorBatch.create({
    data,
    include: { requests: true, enrollments: true, program: true }
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.batch.create",
    entityType: "TutorBatch",
    entityId: batch.id,
    metadata: { programId }
  });
  res.status(201).json({ data: toBatchSummary(batch) });
});

app.put("/api/v1/tutor/batches/:id", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
  if (!tutorProfile) {
    res.status(400).json({ error: "Tutor profile is required before updating batches" });
    return;
  }
  const existing = await prisma.tutorBatch.findFirst({ where: { id: req.params.id, tutorProfileId: tutorProfile.id } });
  if (!existing) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }
  const programId = Object.prototype.hasOwnProperty.call(req.body, "programId") ? stringOrNull(req.body.programId) : existing.programId;
  if (programId && !(await tutorOwnsProgram(profile.id, programId))) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const data = normalizeTutorBatchInput(req.body, tutorProfile.id, programId, existing);
  if (!data.title || !data.course || !data.subject || !data.grade || !data.board || !data.schedule) {
    res.status(400).json({ error: "Batch title, course, subject, grade, board, and schedule are required" });
    return;
  }
  const batch = await prisma.tutorBatch.update({
    where: { id: existing.id },
    data,
    include: { requests: true, enrollments: true, program: true }
  });
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.batch.update",
    entityType: "TutorBatch",
    entityId: batch.id
  });
  res.json({ data: toBatchSummary(batch) });
});

app.post("/api/v1/tutor/batches/:id/archive", async (req, res) => {
  const profile = await requireProfile(req, res, "tutor");
  if (!profile) return;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
  if (!tutorProfile) {
    res.status(400).json({ error: "Tutor profile is required before archiving batches" });
    return;
  }
  const batch = await prisma.tutorBatch.updateMany({
    where: { id: req.params.id, tutorProfileId: tutorProfile.id },
    data: { status: "archived" }
  });
  if (!batch.count) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "tutor",
    action: "tutor.batch.archive",
    entityType: "TutorBatch",
    entityId: req.params.id
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
    const communityReactions = await tx.communityReaction.deleteMany({ where: { userId: user.id } });
    const communityComments = await tx.communityComment.deleteMany({ where: { ownerUserId: user.id } });
    const communityThreads = await tx.communityThread.deleteMany({ where: { ownerUserId: user.id } });
    const resourceProgress = await tx.resourceProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const studentProgramSelections = await tx.studentProgramSelection.deleteMany({ where: { profileId: { in: profileIds } } });
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
        communityReactions: communityReactions.count,
        communityComments: communityComments.count,
        communityThreads: communityThreads.count,
        resourceProgress: resourceProgress.count,
        studentProgramSelections: studentProgramSelections.count,
        programProgress: programProgress.count,
        profiles: profiles.count,
        users: 1
      }
    };
  });

  res.json({ data: result });
});

function generateActivationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function uniqueActivationCode() {
  for (let index = 0; index < 8; index += 1) {
    const code = generateActivationCode();
    const existing = await prisma.parentActivationCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return String(Date.now()).slice(-6);
}

app.get("/api/v1/parent-activation", async (req, res) => {
  const role = readRole(req.query.role);
  try {
    await ensureParentStudentFixture();
  } catch (error) {
    if (!isMissingParentLinkTable(error)) throw error;
    res.json({ data: role === "student" ? { codes: [], parents: [] } : { children: [] } });
    return;
  }
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (role === "student") {
    const codes = await prisma.parentActivationCode.findMany({
      where: { studentProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { parentProfile: true }
    });
    const parents = await prisma.parentStudentLink.findMany({
      where: { studentProfileId: profile.id, status: "active" },
      include: { parentProfile: true },
      orderBy: { createdAt: "asc" }
    });
    res.json({ data: {
      codes: codes.map((item) => ({ id: item.id, code: item.code, relationship: item.relationship, status: item.status, acceptedAt: item.acceptedAt })),
      parents: parents.map((item) => ({ id: item.parentProfileId, name: item.parentProfile.firstName + " " + item.parentProfile.lastName, relationship: item.relationship, status: item.status }))
    } });
    return;
  }
  const children = await prisma.parentStudentLink.findMany({
    where: { parentProfileId: profile.id, status: "active" },
    include: { studentProfile: true },
    orderBy: { createdAt: "asc" }
  });
  res.json({ data: { children: children.map((item) => ({ id: item.studentProfileId, name: item.studentProfile.firstName + " " + item.studentProfile.lastName, relationship: item.relationship, status: item.status })) } });
});

app.post("/api/v1/parent-activation", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  try {
    await ensureParentStudentFixture();
  } catch (error) {
    if (!isMissingParentLinkTable(error)) throw error;
    res.status(503).json({ error: "Parent activation is not ready. Please apply the latest DB migration." });
    return;
  }
  const student = await findProfile("student", userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const relationship = String(req.body.relationship ?? "Parent").trim() || "Parent";
  const code = await uniqueActivationCode();
  const invite = await prisma.parentActivationCode.create({
    data: {
      code,
      studentUserId: userId,
      studentProfileId: student.id,
      relationship,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      sourceTag: "app"
    }
  });
  res.status(201).json({ data: { id: invite.id, code: invite.code, relationship: invite.relationship, status: invite.status } });
});

app.get("/api/v1/bootstrap", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  res.json({
    persona: profile ? toPersona(profile) : fallbackPersona(role),
    featureFlags,
    paletteConfig,
    roleThemes,
    role
  });
});

app.get("/api/v1/theme/palette", (_req, res) => {
  res.json({ data: { paletteConfig, roleThemes } });
});

app.get("/api/v1/community/threads", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const status = stringOrNull(req.query.status);
  const search = stringOrNull(req.query.search)?.toLowerCase();
  const childProfileIds = role === "parent" ? await getParentChildProfileIds(userId) : [];
  if (role === "parent" && childProfileIds.length === 0) {
    res.json({ data: [] });
    return;
  }
  const where: Record<string, unknown> = {
    role: role === "parent" ? "student" : role,
    ...(role === "parent" ? { ownerProfileId: { in: childProfileIds } } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { milestoneTitle: { contains: search, mode: "insensitive" } }
      ]
    } : {})
  };
  const threads = await prisma.communityThread.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: Math.min(Number(req.query.limit) || 50, 100),
    include: communityThreadInclude(userId)
  });
  res.json({ data: threads.map((thread) => toCommunityThread(thread, userId)) });
});

app.post("/api/v1/community/threads", async (req, res) => {
  const role = readRole(req.body.role);
  if (role === "parent") {
    res.status(403).json({ error: "Parents can view community threads only" });
    return;
  }
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const profile = await findProfile(role, userId);
  const title = String(req.body.title ?? "").trim();
  const body = String(req.body.body ?? "").trim();
  if (!title || !body) {
    res.status(400).json({ error: "Title and body are required" });
    return;
  }
  const thread = await prisma.communityThread.create({
    data: {
      ownerUserId: userId,
      ownerProfileId: profile?.id,
      role,
      title,
      body,
      subject: stringOrNull(req.body.subject),
      milestoneTitle: stringOrNull(req.body.milestoneTitle),
      anonymous: Boolean(req.body.anonymous),
      attachmentUrl: stringOrNull(req.body.attachmentUrl),
      sourceTag: "app"
    },
    include: communityThreadInclude(userId)
  });
  res.status(201).json({ data: toCommunityThread(thread, userId) });
});

app.get("/api/v1/community/threads/:id", async (req, res) => {
  const userId = await readUserId(req);
  const role = req.query.role ? readRole(req.query.role) : null;
  const thread = await prisma.communityThread.findUnique({
    where: { id: req.params.id },
    include: communityThreadDetailInclude(userId)
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (role === "parent") {
    const childProfileIds = await getParentChildProfileIds(userId);
    if (!thread.ownerProfileId || !childProfileIds.includes(thread.ownerProfileId)) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
  }
  res.json({ data: toCommunityThread(thread, userId, true) });
});

app.patch("/api/v1/community/threads/:id", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const current = await prisma.communityThread.findUnique({ where: { id: req.params.id } });
  if (!current) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (current.ownerUserId !== userId) {
    res.status(403).json({ error: "Only the thread owner can update this thread" });
    return;
  }
  const status = stringOrNull(req.body.status);
  const thread = await prisma.communityThread.update({
    where: { id: req.params.id },
    data: {
      ...(status === "open" || status === "solved" || status === "archived" ? { status } : {}),
      title: stringOrNull(req.body.title) ?? current.title,
      body: stringOrNull(req.body.body) ?? current.body
    },
    include: communityThreadInclude(userId)
  });
  res.json({ data: toCommunityThread(thread, userId) });
});

app.post("/api/v1/community/threads/:id/comments", async (req, res) => {
  const role = readRole(req.body.role ?? req.query.role);
  if (role === "parent") {
    res.status(403).json({ error: "Parents can view community threads only" });
    return;
  }
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const thread = await prisma.communityThread.findUnique({ where: { id: req.params.id } });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  const body = String(req.body.body ?? "").trim();
  if (!body) {
    res.status(400).json({ error: "Comment body is required" });
    return;
  }
  const profile = await findProfile(role, userId);
  const comment = await prisma.communityComment.create({
    data: {
      threadId: req.params.id,
      ownerUserId: userId,
      ownerProfileId: profile?.id,
      body,
      anonymous: Boolean(req.body.anonymous),
      verified: profile?.role === "tutor",
      sourceTag: "app"
    },
    include: communityCommentInclude(userId)
  });
  res.status(201).json({ data: toCommunityComment(comment, userId) });
});

app.put("/api/v1/community/reactions", async (req, res) => {
  const role = req.body.role || req.query.role ? readRole(req.body.role ?? req.query.role) : null;
  if (role === "parent") {
    res.status(403).json({ error: "Parents can view community reactions only" });
    return;
  }
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const type = readCommunityReactionType(req.body.type);
  const threadId = stringOrNull(req.body.threadId);
  const commentId = stringOrNull(req.body.commentId);
  if ((!threadId && !commentId) || (threadId && commentId)) {
    res.status(400).json({ error: "Provide exactly one reaction target" });
    return;
  }
  if (threadId) {
    const thread = await prisma.communityThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
  }
  if (commentId) {
    const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
  }
  const existing = await prisma.communityReaction.findFirst({
    where: { userId, type, ...(threadId ? { threadId } : { commentId }) }
  });
  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    res.json({ data: { active: false, type, threadId, commentId } });
    return;
  }
  await prisma.communityReaction.create({
    data: { userId, type, threadId, commentId, sourceTag: "app" }
  });
  res.status(201).json({ data: { active: true, type, threadId, commentId } });
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

app.get("/api/v1/usermanagement/users", async (req, res) => {
  const role = readRole(req.query.Role ?? req.query.role);
  if (role === "tutor") await ensureSharedTutorFixture();
  const profiles = await prisma.profile.findMany({
    where: { role },
    include: { user: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 100
  });
  res.json({ data: profiles.map(toUserListItem) });
});

app.get("/api/v1/usermanagement/getUserProfile", async (req, res) => {
  await ensureSharedTutorFixture();
  const userId = stringOrNull(req.query.userId);
  const role = req.query.Role || req.query.role ? readRole(req.query.Role ?? req.query.role) : undefined;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const profile = await prisma.profile.findFirst({
    where: { userId, ...(role ? { role } : {}) },
    include: {
      user: true,
      tutorProfile: {
        include: {
          batches: {
            orderBy: { startsAt: "asc" },
            include: { requests: true, enrollments: true }
          }
        }
      },
      authoredPrograms: {
        where: { status: "published", visibility: "published" },
        orderBy: { title: "asc" },
        include: { milestones: { include: { activities: true } } }
      }
    },
    orderBy: { createdAt: "asc" }
  });
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ data: toUserProfileDetails(profile) });
});

app.put("/api/v1/usermanagement/profile", async (req, res) => {
  const role = readRole(req.body.role);
  const current = await requireProfile(req, res, role);
  if (!current) {
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
  await logAudit({
    userId: current.userId,
    profileId: current.id,
    role,
    action: "profile.update",
    entityType: "Profile",
    entityId: current.id
  });

  res.json({ data: { profile, userManagement } });
});

app.get("/api/v1/usermanagement/tutors", async (req, res) => {
  await ensureSharedTutorFixture();
  const userId = await readUserId(req);
  const studentProfile = await findProfile("student", userId);
  const selectedProgramIds = studentProfile
    ? new Set((await prisma.studentProgramSelection.findMany({ where: { profileId: studentProfile.id, status: "active" }, select: { programId: true } })).map((item) => item.programId))
    : new Set<string>();
  const batchWhere: Record<string, unknown> = {};
  if (req.query.subject) batchWhere.subject = textContains(req.query.subject);
  if (req.query.grade) batchWhere.grade = textContains(req.query.grade);
  if (req.query.board) batchWhere.board = textContains(req.query.board);
  if (req.query.mode) batchWhere.mode = textContains(req.query.mode);

  const tutorWhere: Record<string, unknown> = {};
  if (req.query.location) tutorWhere.location = textContains(req.query.location);
  if (req.query.language) tutorWhere.languages = textContains(req.query.language);
  if (req.query.gender) tutorWhere.gender = textContains(req.query.gender);
  if (req.query.minExperience) tutorWhere.experienceYears = { gte: Number(req.query.minExperience) || 0 };
  if (req.query.minRating) tutorWhere.rating = { gte: Number(req.query.minRating) || 0 };
  if (Object.keys(batchWhere).length) tutorWhere.batches = { some: batchWhere };

  const tutors = await prisma.tutorProfile.findMany({
    where: tutorWhere,
    include: {
      profile: {
        include: {
          authoredPrograms: {
            where: { status: "published", visibility: "published" },
            orderBy: { title: "asc" },
            include: { milestones: { include: { activities: true } } }
          }
        }
      },
      batches: {
        where: batchWhere,
        orderBy: { startsAt: "asc" },
        include: { requests: true, enrollments: true }
      }
    },
    orderBy: [{ rating: "desc" }, { experienceYears: "desc" }],
    take: 40
  });
  res.json({ data: tutors.map((tutor) => toTutorSearchResult(tutor, { studentProfileId: studentProfile?.id, selectedProgramIds })) });
});

app.get("/api/v1/marketplace/recommendations", async (req, res) => {
  const role = readRole(req.query.role);
  if (role !== "student") {
    res.json({ data: { tutors: [], programs: [], batches: [] } });
    return;
  }

  await ensureSharedTutorFixture();
  const userId = await readUserId(req);
  const studentProfile = await findProfile("student", userId);
  const selectedProgramIds = studentProfile
    ? new Set((await prisma.studentProgramSelection.findMany({ where: { profileId: studentProfile.id, status: "active" }, select: { programId: true } })).map((item) => item.programId))
    : new Set<string>();
  const tutors = await prisma.tutorProfile.findMany({
    where: { profileStatus: "active" },
    include: {
      profile: {
        include: {
          authoredPrograms: {
            where: { status: "published", visibility: "published" },
            orderBy: [{ feeType: "asc" }, { title: "asc" }],
            include: { milestones: { include: { activities: true } } }
          }
        }
      },
      batches: {
        where: { status: { not: "archived" } },
        orderBy: [{ startsAt: "asc" }],
        include: { requests: true, enrollments: true, program: true }
      }
    }
  });
  const ranked = tutors
    .map((tutor) => ({ tutor, score: marketplaceFitScore(tutor, studentProfile), reasons: marketplaceFitReasons(tutor, studentProfile) }))
    .sort((a, b) => b.score - a.score || b.tutor.rating - a.tutor.rating || b.tutor.experienceYears - a.tutor.experienceYears);
  const tutorResults = ranked.slice(0, 8).map((item) => toTutorSearchResult(item.tutor, { studentProfileId: studentProfile?.id, selectedProgramIds }));
  const programs = ranked
    .flatMap((item) => (item.tutor.profile.authoredPrograms ?? []).map((program: any) => toMarketplaceProgram(program, item.tutor, item.score, item.reasons, selectedProgramIds)))
    .slice(0, 8);
  const batches = ranked
    .flatMap((item) => (item.tutor.batches ?? []).map((batch: any) => toMarketplaceBatch(batch, item.tutor, item.score, item.reasons, studentProfile?.id)))
    .filter((batch) => batch.availabilityStatus !== "archived" && batch.availabilityStatus !== "booked")
    .slice(0, 8);
  res.json({ data: { tutors: tutorResults, programs, batches } });
});

app.post("/api/v1/usermanagement/batch-requests", async (req, res) => {
  const userId = await readUserId(req);
  const student = await findProfile("student", userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const batchId = String(req.body.batchId ?? "");
  const batch = await prisma.tutorBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }
  const request = await prisma.batchRequest.upsert({
    where: { batchId_studentProfileId: { batchId, studentProfileId: student.id } },
    update: { status: "pending", message: stringOrNull(req.body.message), sourceTag: "app" },
    create: { batchId, studentProfileId: student.id, message: stringOrNull(req.body.message), sourceTag: "app" },
    include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
  });
  res.status(201).json({ data: toBatchRequestSummary(request) });
});

app.get("/api/v1/usermanagement/batch-requests", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (role === "tutor") {
    const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
    const requests = tutorProfile ? await prisma.batchRequest.findMany({
      where: { batch: { tutorProfileId: tutorProfile.id } },
      include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true },
      orderBy: { createdAt: "desc" }
    }) : [];
    res.json({ data: await enrichBatchRequestSummaries(requests) });
    return;
  }
  const requests = await prisma.batchRequest.findMany({
    where: { studentProfileId: profile.id },
    include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: await enrichBatchRequestSummaries(requests) });
});

app.post("/api/v1/usermanagement/batch-requests/:id/approve", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({
    where: { id: req.params.id },
    include: { batch: { include: { tutorProfile: true } }, studentProfile: true }
  });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  await prisma.$transaction(async (tx) => {
    const approved = await tx.batchRequest.update({ where: { id: request.id }, data: { status: "approved" } });
    const enrollment = await tx.batchEnrollment.upsert({
      where: { batchId_studentProfileId: { batchId: request.batchId, studentProfileId: request.studentProfileId } },
      update: { status: "active", requestId: request.id },
      create: { batchId: request.batchId, studentProfileId: request.studentProfileId, requestId: request.id, status: "active", sourceTag: "app" }
    });
    await tx.reminder.create({
      data: {
        userId: request.studentProfile.userId,
        profileId: request.studentProfileId,
        role: "student",
        title: `Class: ${request.batch.title}`,
        startsAt: request.batch.startsAt,
        sourceTag: "app"
      }
    });
    return { approved, enrollment };
  });
  const updatedRequest = await prisma.batchRequest.findUnique({
    where: { id: request.id },
    include: { batch: { include: { tutorProfile: { include: { profile: true } }, enrollments: { include: { studentProfile: true } }, requests: true } }, studentProfile: true }
  });
  res.json({
    data: {
      request: updatedRequest ? toBatchRequestSummary(updatedRequest) : null,
      class: updatedRequest ? toTutorBatchClass(updatedRequest.batch) : null
    }
  });
});

app.post("/api/v1/usermanagement/batch-requests/:id/reject", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } } } });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const rejected = await prisma.batchRequest.update({ where: { id: request.id }, data: { status: "rejected", tutorResponse: stringOrNull(req.body.message) ?? "Tutor denied this request." } });
  res.json({ data: rejected });
});

app.post("/api/v1/usermanagement/batch-requests/:id/defer", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } } } });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const deferred = await prisma.batchRequest.update({ where: { id: request.id }, data: { status: "deferred", tutorResponse: stringOrNull(req.body.message) ?? "Tutor deferred this request for a later slot." } });
  res.json({ data: deferred });
});

app.post("/api/v1/usermanagement/batch-requests/:id/suggest", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } } } });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  let suggestedBatchId = stringOrNull(req.body.suggestedBatchId);
  if (!suggestedBatchId || suggestedBatchId === request.batchId) {
    const alternate = await prisma.tutorBatch.findFirst({
      where: { tutorProfileId: request.batch.tutorProfileId, id: { not: request.batchId } },
      orderBy: { startsAt: "asc" }
    });
    suggestedBatchId = alternate?.id ?? suggestedBatchId;
  }
  const suggested = await prisma.batchRequest.update({
    where: { id: request.id },
    data: {
      status: "suggested",
      suggestedBatchId,
      tutorResponse: stringOrNull(req.body.message) ?? "Tutor suggested another batch."
    }
  });
  res.json({ data: suggested });
});

app.post("/api/v1/usermanagement/batch-requests/:id/accept-suggestion", async (req, res) => {
  const userId = await readUserId(req);
  const student = await findProfile("student", userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({
    where: { id: req.params.id },
    include: { batch: { include: { tutorProfile: true } } }
  });
  if (!request || request.studentProfileId !== student.id || request.status !== "suggested" || !request.suggestedBatchId) {
    res.status(404).json({ error: "Suggested request not found" });
    return;
  }
  const suggestedBatch = await prisma.tutorBatch.findFirst({
    where: { id: request.suggestedBatchId, tutorProfileId: request.batch.tutorProfileId, status: { not: "archived" } },
    include: { tutorProfile: { include: { profile: true } }, requests: true, enrollments: true }
  });
  if (!suggestedBatch) {
    res.status(404).json({ error: "Suggested batch is no longer available" });
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    await tx.batchRequest.update({
      where: { id: request.id },
      data: { status: "dismissed", tutorResponse: "Student accepted suggested batch." }
    });
    return tx.batchRequest.upsert({
      where: { batchId_studentProfileId: { batchId: suggestedBatch.id, studentProfileId: student.id } },
      update: { status: "pending", message: "I accept the suggested batch.", sourceTag: "app" },
      create: { batchId: suggestedBatch.id, studentProfileId: student.id, message: "I accept the suggested batch.", sourceTag: "app" },
      include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
    });
  });
  res.status(201).json({ data: toBatchRequestSummary(result) });
});

app.post("/api/v1/usermanagement/batch-requests/:id/withdraw", async (req, res) => {
  const userId = await readUserId(req);
  const student = await findProfile("student", userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({
    where: { id: req.params.id },
    include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
  });
  if (!request || request.studentProfileId !== student.id || !["pending", "suggested"].includes(request.status)) {
    res.status(404).json({ error: "Withdrawable request not found" });
    return;
  }
  const withdrawn = await prisma.batchRequest.update({
    where: { id: request.id },
    data: { status: "cancelled", tutorResponse: "Student withdrew this request." },
    include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
  });
  res.json({ data: toBatchRequestSummary(withdrawn) });
});

app.post("/api/v1/usermanagement/batch-requests/:id/dismiss", async (req, res) => {
  const userId = await readUserId(req);
  const student = await findProfile("student", userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.studentProfileId !== student.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const dismissed = await prisma.batchRequest.update({ where: { id: request.id }, data: { status: "dismissed" } });
  res.json({ data: dismissed });
});

app.get("/api/v1/usermanagement/classes", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (role === "tutor") {
    const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
    const batches = tutorProfile ? await prisma.tutorBatch.findMany({
      where: { tutorProfileId: tutorProfile.id },
      include: { enrollments: { include: { studentProfile: true } }, requests: true, tutorProfile: { include: { profile: true } } },
      orderBy: { startsAt: "asc" }
    }) : [];
    res.json({ data: batches.map(toTutorBatchClass) });
    return;
  }
  if (role === "parent") {
    const childProfileIds = await getParentChildProfileIds(userId);
    if (!childProfileIds.length) {
      res.json({ data: [] });
      return;
    }
    const enrollments = await prisma.batchEnrollment.findMany({
      where: { studentProfileId: { in: childProfileIds }, status: "active" },
      include: { batch: { include: { tutorProfile: { include: { profile: true } }, enrollments: { include: { studentProfile: true } } } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ data: enrollments.map((enrollment) => toStudentClass(enrollment.batch, enrollment.id)) });
    return;
  }
  const enrollments = await prisma.batchEnrollment.findMany({
    where: { studentProfileId: profile.id, status: "active" },
    include: { batch: { include: { tutorProfile: { include: { profile: true } }, enrollments: { include: { studentProfile: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: enrollments.map((enrollment) => toStudentClass(enrollment.batch, enrollment.id)) });
});

app.get("/api/v1/recommendations", async (req, res) => {
  const role = readRole(req.query.role);
  if (!isFeatureEnabled("recommendations", role)) {
    res.json({ data: [] });
    return;
  }

  const data = await prisma.recommendation.findMany({
    where: { role },
    include: { content: true },
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
  if (role === "parent") {
    try {
      await ensureParentStudentFixture();
    } catch (error) {
      if (!isMissingParentLinkTable(error)) throw error;
      res.json({ data: [], selectedPrograms: [], maxSelectedPrograms: 3 });
      return;
    }
  }
  if (role === "student") {
    const userId = await readUserId(req);
    const profile = await findProfile(role, userId);
    const programs = await listProgramSummaries(role, profile?.id);
    res.json({
      data: programs,
      selectedPrograms: programs.filter((program) => program.selected),
      maxSelectedPrograms: 3
    });
    return;
  }
  const userId = await readUserId(req);
  const profile = userId ? await findProfile(role, userId) : null;
  if (role === "parent" && profile) {
    const link = await prisma.parentStudentLink.findFirst({ where: { parentProfileId: profile.id, status: "active" }, orderBy: { createdAt: "asc" } });
    if (link) {
      const programs = await listProgramSummaries("student", link.studentProfileId);
      res.json({ data: programs, selectedPrograms: programs.filter((program) => program.selected), maxSelectedPrograms: 3 });
      return;
    }
  }
  const programs = await prisma.program.findMany({
    where: { role, ...(role === "tutor" && profile ? { creatorProfileId: profile.id } : {}) },
    orderBy: { title: "asc" },
    select: { id: true, role: true, title: true, description: true, status: true, visibility: true, creatorProfileId: true, feeType: true, feeAmount: true }
  });
  res.json({ data: programs });
});

app.post("/api/v1/education-plan/programs/select", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await readUserId(req);
  if (role !== "student") {
    res.status(400).json({ error: "Program selection is only available for students" });
    return;
  }
  const profile = await findProfile("student", userId);
  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const programId = String(req.body.programId ?? "");
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      OR: [
        { role },
        { role: "tutor", status: "published", visibility: "published" }
      ]
    }
  });
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const existing = await prisma.studentProgramSelection.findUnique({
    where: { profileId_programId: { profileId: profile.id, programId } }
  });
  const activeCount = await prisma.studentProgramSelection.count({
    where: { profileId: profile.id, status: "active" }
  });
  if (!existing && activeCount >= 3) {
    res.status(409).json({ error: "A student can select a maximum of 3 programs" });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const selection = await tx.studentProgramSelection.upsert({
      where: { profileId_programId: { profileId: profile.id, programId } },
      update: { status: "active", sourceTag: "app" },
      create: { profileId: profile.id, programId, status: "active", sourceTag: "app" }
    });
    const progress = await tx.programProgress.upsert({
      where: { profileId_programId: { profileId: profile.id, programId } },
      update: {},
      create: {
        profileId: profile.id,
        programId,
        unlockedMilestoneSequence: 1,
        completedMilestoneSequence: 0,
        sourceTag: "app"
      }
    });
    return { selection, progress };
  });
  const programs = await listProgramSummaries(role, profile.id);
  res.status(existing ? 200 : 201).json({
    data: result,
    programs,
    selectedPrograms: programs.filter((item) => item.selected),
    maxSelectedPrograms: 3
  });
});

app.post("/api/v1/marketplace/program-interest", async (req, res) => {
  const userId = await readUserId(req);
  const profile = await findProfile("student", userId);
  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const programId = String(req.body.programId ?? "");
  const program = await prisma.program.findFirst({
    where: { id: programId, role: "tutor", status: "published", visibility: "published" },
    include: { creatorProfile: { include: { tutorProfile: true } } }
  });
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  await logAudit({
    userId: profile.userId,
    profileId: profile.id,
    role: "student",
    action: "marketplace.program_interest",
    entityType: "Program",
    entityId: program.id,
    metadata: {
      title: program.title,
      feeType: program.feeType,
      feeAmount: program.feeAmount,
      tutorProfileId: program.creatorProfile?.tutorProfile?.id ?? null,
      tutorProfileOwnerId: program.creatorProfileId
    }
  });
  res.status(201).json({
    data: {
      programId: program.id,
      status: "interest_recorded",
      message: "Purchase interest recorded. Payment checkout will be available in a later release."
    }
  });
});

app.post("/api/v1/education-plan/tutor/programs", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;

  const input = normalizeTutorProgramInput(req.body);
  const publishing = input.visibility !== "private";
  if (!input.title || !input.description || (publishing && !input.milestones?.length)) {
    res.status(400).json({ error: publishing ? "Published programs require title, description, milestones, and resources" : "Program title and description are required" });
    return;
  }

  const program = await prisma.$transaction(async (tx) => {
    const createdProgram = await tx.program.create({
      data: {
        role: "tutor",
        title: input.title,
        description: input.description,
        creatorProfileId: tutor.id,
        visibility: input.visibility ?? "published",
        status: input.visibility === "private" ? "draft" : "published",
        feeType: input.feeType ?? "free",
        feeAmount: input.feeType === "paid" ? input.feeAmount ?? 0 : null,
        sourceTag: "app"
      }
    });
    await writeTutorProgramTree(tx, createdProgram.id, tutor.id, input);

    return tx.program.findUnique({
      where: { id: createdProgram.id },
      include: { milestones: { include: { activities: true }, orderBy: { sequence: "asc" } } }
    });
  });

  await logAudit({
    userId: tutor.userId,
    profileId: tutor.id,
    role: "tutor",
    action: publishing ? "tutor.program.publish" : "tutor.program.create_draft",
    entityType: "Program",
    entityId: program?.id
  });
  res.status(201).json({ data: tutorProgramSummary(program) });
});


function tutorProgramToDraft(program: any) {
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    visibility: program.visibility,
    feeType: program.feeType,
    feeAmount: program.feeAmount,
    milestones: (program.milestones ?? []).map((milestone: any) => ({
      title: milestone.title,
      sequence: milestone.sequence,
      resources: (milestone.activities ?? []).map((activity: any) => {
        const resource = activity.resource ?? {};
        const questions = Array.isArray(resource.contentJson?.questions) ? resource.contentJson.questions : [];
        return {
          type: activity.type,
          title: activity.title,
          description: activity.description,
          body: resource.body ?? "",
          mediaUrl: resource.sourceUrl ?? "",
          flashcards: (resource.flashcards ?? []).map((card: any) => ({ question: card.question, answer: card.answer })),
          quizQuestions: questions.map((question: any) => ({
            prompt: String(question.prompt ?? ""),
            options: Array.isArray(question.options) ? question.options.map(String) : [],
            answerIndex: Number(question.answerIndex ?? 0) || 0,
            learnMore: String(question.learnMore ?? "")
          }))
        };
      })
    }))
  };
}

function tutorProgramSummary(program: any): ProgramSummary {
  const milestones = program.milestones ?? [];
  const activityCount = milestones.reduce((total: number, milestone: any) => total + (milestone.activities?.length ?? 0), 0);
  return {
    id: program.id,
    role: "tutor",
    title: program.title,
    description: program.description,
    status: program.status,
    visibility: program.visibility,
    creatorProfileId: program.creatorProfileId,
    feeType: program.feeType,
    feeAmount: program.feeAmount,
    selected: false,
    milestoneCount: milestones.length,
    activityCount
  } as ProgramSummary;
}

async function writeTutorProgramTree(tx: any, programId: string, tutorId: string, input: TutorProgramCreateInput) {
  const orderedMilestones = [...(input.milestones ?? [])].sort((a, b) => a.sequence - b.sequence);
  for (const milestoneInput of orderedMilestones) {
    const milestone = await tx.programMilestone.create({
      data: {
        programId,
        sequence: milestoneInput.sequence,
        title: milestoneInput.title,
        sourceTag: "app"
      }
    });
    for (const [index, resourceInput] of milestoneInput.resources.entries()) {
      const resource = await tx.resource.create({
        data: tutorResourceData(resourceInput, tutorId)
      });
      await writeResourceFlashcards(tx, resource.id, resourceInput);
      await tx.milestoneActivity.create({
        data: {
          milestoneId: milestone.id,
          resourceId: resource.id,
          sequence: index + 1,
          type: resourceInput.type,
          title: resourceInput.title,
          description: resourceInput.description,
          sourceTag: "app"
        }
      });
    }
  }
}

app.get("/api/v1/education-plan/tutor/programs/:id", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;
  const program = await prisma.program.findFirst({
    where: { id: req.params.id, creatorProfileId: tutor.id, role: "tutor" },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
        include: { activities: { orderBy: { sequence: "asc" }, include: { resource: { include: { flashcards: { orderBy: { sequence: "asc" } } } } } } }
      }
    }
  });
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  res.json({ data: tutorProgramToDraft(program) });
});

app.put("/api/v1/education-plan/tutor/programs/:id", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;
  const input = normalizeTutorProgramInput(req.body);
  if (!input.title || !input.description || !input.milestones?.length) {
    res.status(400).json({ error: "Program title, description, milestone, and resources are required" });
    return;
  }
  const existing = await prisma.program.findFirst({
    where: { id: req.params.id, creatorProfileId: tutor.id, role: "tutor" },
    include: { milestones: { include: { activities: true } } }
  });
  if (!existing) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  if (existing.status === "published") {
    res.status(409).json({ error: "Published programs are view-only. Archive or create a new draft version to change content." });
    return;
  }
  const program = await prisma.$transaction(async (tx) => {
    const milestoneIds = existing.milestones.map((milestone) => milestone.id);
    const activities = existing.milestones.flatMap((milestone) => milestone.activities);
    const activityIds = activities.map((activity) => activity.id);
    const resourceIds = activities.map((activity) => activity.resourceId);
    if (activityIds.length) await tx.activityProgress.deleteMany({ where: { activityId: { in: activityIds } } });
    if (activityIds.length) await tx.milestoneActivity.deleteMany({ where: { id: { in: activityIds } } });
    if (resourceIds.length) await tx.flashcard.deleteMany({ where: { resourceId: { in: resourceIds } } });
    if (resourceIds.length) await tx.resourceProgress.deleteMany({ where: { resourceId: { in: resourceIds } } });
    if (resourceIds.length) await tx.resource.deleteMany({ where: { id: { in: resourceIds } } });
    if (milestoneIds.length) await tx.programMilestone.deleteMany({ where: { id: { in: milestoneIds } } });
    const updated = await tx.program.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        description: input.description,
        visibility: input.visibility ?? "published",
        status: input.visibility === "private" ? "draft" : "published",
        feeType: input.feeType ?? "free",
        feeAmount: input.feeType === "paid" ? input.feeAmount ?? 0 : null
      }
    });
    await writeTutorProgramTree(tx, updated.id, tutor.id, input);
    return tx.program.findUnique({
      where: { id: updated.id },
      include: { milestones: { include: { activities: true }, orderBy: { sequence: "asc" } } }
    });
  });
  await logAudit({
    userId: tutor.userId,
    profileId: tutor.id,
    role: "tutor",
    action: input.visibility === "private" ? "tutor.program.update_draft" : "tutor.program.publish",
    entityType: "Program",
    entityId: existing.id
  });
  res.json({ data: tutorProgramSummary(program) });
});

app.post("/api/v1/education-plan/tutor/programs/:id/publish", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;
  const program = await prisma.program.findFirst({
    where: { id: req.params.id, creatorProfileId: tutor.id, role: "tutor" },
    include: { milestones: { include: { activities: true } } }
  });
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const hasContent = program.milestones.length > 0 && program.milestones.every((milestone) => milestone.activities.length > 0);
  if (!hasContent) {
    res.status(400).json({ error: "Program needs at least one activity in each milestone before publishing" });
    return;
  }
  const updated = await prisma.program.update({
    where: { id: program.id },
    data: { status: "published", visibility: "published" },
    include: { milestones: { include: { activities: true } } }
  });
  await logAudit({
    userId: tutor.userId,
    profileId: tutor.id,
    role: "tutor",
    action: "tutor.program.publish",
    entityType: "Program",
    entityId: program.id
  });
  res.json({ data: tutorProgramSummary(updated) });
});

app.post("/api/v1/education-plan/tutor/programs/:id/archive", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;
  const updated = await prisma.program.updateMany({
    where: { id: req.params.id, creatorProfileId: tutor.id, role: "tutor" },
    data: { status: "archived", visibility: "private" }
  });
  if (!updated.count) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  await logAudit({
    userId: tutor.userId,
    profileId: tutor.id,
    role: "tutor",
    action: "tutor.program.archive",
    entityType: "Program",
    entityId: req.params.id
  });
  res.status(204).send();
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
    include: {
      flashcards: { orderBy: { sequence: "asc" } },
      milestoneActivities: { include: { milestone: { include: { program: true } } } }
    }
  });
  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  const entitlement = await resolveResourceEntitlement(req, resource);
  if (!entitlement.entitled) {
    res.status(403).json({ error: "Resource access denied" });
    return;
  }
  res.json({ data: withAssetUrls(withFlashcardFallback(resource), { ...entitlement, accessToken: readRequestAccessToken(req) }) });
});

app.get("/api/v1/ams/assets/:id", async (req, res) => {
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: {
      flashcards: { orderBy: { sequence: "asc" } },
      milestoneActivities: { include: { milestone: { include: { program: true } } } }
    }
  });
  if (!resource) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const entitlement = await resolveResourceEntitlement(req, resource);
  if (!entitlement.entitled) {
    res.status(403).json({ error: "Asset access denied" });
    return;
  }
  res.json({ data: withAssetUrls(withFlashcardFallback(resource), { ...entitlement, accessToken: readRequestAccessToken(req) }) });
});

app.get("/api/v1/ams/assets/:id/file/:kind", async (req, res) => {
  const kind = String(req.params.kind) as AssetKind;
  if (!["thumbnail", "banner", "vtt", "metadata"].includes(kind)) {
    res.status(400).json({ error: "Unsupported asset kind" });
    return;
  }
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: { milestoneActivities: { include: { milestone: { include: { program: true } } } } }
  });
  if (!resource) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const entitlement = await resolveResourceEntitlement(req, resource);
  if (!entitlement.entitled) {
    res.status(403).json({ error: "Asset access denied" });
    return;
  }
  const assetPath = assetPathForKind(resource, kind);
  if (!assetPath) {
    res.status(404).json({ error: "Asset file not configured" });
    return;
  }
  const relativePath = assetPath.replace(/^services\/api\/assets\//, "");
  const fullPath = path.resolve(assetsRoot, relativePath);
  if (!fullPath.startsWith(assetsRoot)) {
    res.status(400).json({ error: "Invalid asset path" });
    return;
  }
  res.sendFile(fullPath);
});

app.get("/api/v1/resources/:id/quiz", async (req, res) => {
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: { milestoneActivities: { include: { milestone: { include: { program: true } } } } }
  });
  if (resource && resource.type !== "quiz") {
    res.status(400).json({ error: "Resource is not a quiz" });
    return;
  }
  if (resource) {
    const entitlement = await resolveResourceEntitlement(req, resource);
    if (!entitlement.entitled) {
      res.status(403).json({ error: "Quiz access denied" });
      return;
    }
  }
  const contentJson = resource?.contentJson as { questions?: QuizQuestion[] } | null | undefined;
  const resourceQuestions = contentJson && Array.isArray(contentJson.questions)
    ? contentJson.questions
    : null;
  res.json({
    data: {
      resourceId: req.params.id,
      title: resource?.title ?? "Diagnostic MCQ quiz",
      description: resource?.description ?? "Answer each question to calculate your score and unlock the next learning step.",
      questions: resourceQuestions ?? quizQuestionBank
    }
  });
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

app.post("/api/v1/education-plan/activities/:id/complete", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.milestoneActivity.findUnique({
      where: { id: req.params.id },
      include: { milestone: { include: { program: true, activities: true } } }
    });
    if (!activity || (activity.milestone.program.role !== role && !(role === "student" && activity.milestone.program.role === "tutor"))) return null;

    const completedActivity = await tx.activityProgress.upsert({
      where: { profileId_activityId: { profileId: profile.id, activityId: activity.id } },
      update: { status: "complete", completedAt: new Date() },
      create: {
        profileId: profile.id,
        activityId: activity.id,
        status: "complete",
        completedAt: new Date(),
        sourceTag: "app"
      }
    });
    await tx.resourceProgress.upsert({
      where: { profileId_resourceId: { profileId: profile.id, resourceId: activity.resourceId } },
      update: { status: "complete", completedAt: new Date() },
      create: {
        profileId: profile.id,
        resourceId: activity.resourceId,
        status: "complete",
        completedAt: new Date()
      }
    });

    const siblingActivities = await tx.milestoneActivity.findMany({ where: { milestoneId: activity.milestoneId } });
    const siblingProgress = await tx.activityProgress.findMany({
      where: {
        profileId: profile.id,
        activityId: { in: siblingActivities.map((item) => item.id) },
        status: "complete"
      }
    });
    const milestoneComplete = siblingActivities.length > 0 && siblingProgress.length === siblingActivities.length;
    let progress = await tx.programProgress.findUnique({
      where: { profileId_programId: { profileId: profile.id, programId: activity.milestone.programId } }
    });
    if (milestoneComplete) {
      progress = await tx.programProgress.upsert({
        where: { profileId_programId: { profileId: profile.id, programId: activity.milestone.programId } },
        update: {
          completedMilestoneSequence: Math.max(progress?.completedMilestoneSequence ?? 0, activity.milestone.sequence),
          unlockedMilestoneSequence: Math.max(progress?.unlockedMilestoneSequence ?? 1, activity.milestone.sequence + 1)
        },
        create: {
          profileId: profile.id,
          programId: activity.milestone.programId,
          completedMilestoneSequence: activity.milestone.sequence,
          unlockedMilestoneSequence: activity.milestone.sequence + 1,
          sourceTag: "app"
        }
      });
    }
    return { activity: completedActivity, milestoneComplete, progress };
  });

  if (!result) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json({ data: result });
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
  const accessToken = readRequestAccessToken(req);
  if (!accessToken) return null;
  const session = await prisma.authSession.findUnique({ where: { accessToken } });
  if (!session || session.revokedAt || session.accessTokenExpiresAt < new Date()) return null;
  return session.userId;
}

function readRequestAccessToken(req: express.Request) {
  return readBearer(req.headers.authorization) || stringOrNull(req.query.accessToken) || "";
}

async function requireUserId(req: express.Request, res: express.Response) {
  const userId = await readUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

async function requireProfile(req: express.Request, res: express.Response, role: Role) {
  const userId = await requireUserId(req, res);
  if (!userId) return null;
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return null;
  }
  return profile;
}

async function logAudit(input: {
  userId?: string | null;
  profileId?: string | null;
  role?: Role | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        profileId: input.profileId ?? null,
        role: input.role ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as any : undefined,
        sourceTag: "app"
      }
    });
  } catch (error) {
    console.warn("audit log skipped", error);
  }
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

function textContains(value: unknown) {
  return { contains: String(value ?? "").trim(), mode: "insensitive" as const };
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function csvString(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean).join(", ");
}

async function tutorOwnsProgram(profileId: string, programId: string) {
  const count = await prisma.program.count({
    where: { id: programId, creatorProfileId: profileId, role: "tutor", status: { not: "archived" } }
  });
  return count > 0;
}

function emptyTutorSupplyAnalytics() {
  return {
    programs: { total: 0, draft: 0, published: 0, archived: 0 },
    batches: { total: 0, active: 0, available: 0, fillingFast: 0, booked: 0, archived: 0 },
    requests: { total: 0, pending: 0, approved: 0, rejected: 0, deferred: 0, suggested: 0 },
    enrollments: { active: 0 }
  };
}

async function buildTutorSupplyAnalytics(profileId: string, tutorProfileId: string) {
  const [programs, batches, requests, activeEnrollments] = await Promise.all([
    prisma.program.findMany({ where: { creatorProfileId: profileId, role: "tutor" }, select: { status: true, visibility: true } }),
    prisma.tutorBatch.findMany({ where: { tutorProfileId }, select: { status: true } }),
    prisma.batchRequest.findMany({ where: { batch: { tutorProfileId } }, select: { status: true } }),
    prisma.batchEnrollment.count({ where: { batch: { tutorProfileId }, status: "active" } })
  ]);
  const analytics = emptyTutorSupplyAnalytics();
  analytics.programs.total = programs.length;
  analytics.programs.published = programs.filter((program) => program.status === "published" || program.visibility === "published").length;
  analytics.programs.archived = programs.filter((program) => program.status === "archived").length;
  analytics.programs.draft = programs.filter((program) => program.status !== "published" && program.status !== "archived" && program.visibility !== "published").length;
  analytics.batches.total = batches.length;
  analytics.batches.archived = batches.filter((batch) => batch.status === "archived").length;
  analytics.batches.active = batches.length - analytics.batches.archived;
  analytics.batches.available = batches.filter((batch) => !batch.status || batch.status === "available").length;
  analytics.batches.fillingFast = batches.filter((batch) => batch.status === "filling_fast").length;
  analytics.batches.booked = batches.filter((batch) => batch.status === "booked").length;
  analytics.requests.total = requests.length;
  analytics.requests.pending = requests.filter((request) => request.status === "pending").length;
  analytics.requests.approved = requests.filter((request) => request.status === "approved").length;
  analytics.requests.rejected = requests.filter((request) => request.status === "rejected").length;
  analytics.requests.deferred = requests.filter((request) => request.status === "deferred").length;
  analytics.requests.suggested = requests.filter((request) => request.status === "suggested").length;
  analytics.enrollments.active = activeEnrollments;
  return analytics;
}

async function resolveResourceEntitlement(req: express.Request, resource: any) {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const publicAccess = resource.accessLevel === "public";
  if (!userId) return { entitled: publicAccess, readonly: true, role, profile: null };
  const profile = await findProfile(role, userId);
  if (!profile) return { entitled: publicAccess, readonly: true, role, profile: null };
  if (publicAccess) return { entitled: true, readonly: role === "parent", role, profile };

  const activities = resource.milestoneActivities ?? [];
  const programs = activities.map((activity: any) => activity.milestone?.program).filter(Boolean);
  const programIds: string[] = Array.from(new Set(programs.map((program: any) => program.id).filter((id: unknown): id is string => typeof id === "string" && id.length > 0)));

  if (role === "tutor") {
    const ownsResource = resource.creatorProfileId === profile.id;
    const ownsProgram = programs.some((program: any) => program.creatorProfileId === profile.id);
    return { entitled: ownsResource || ownsProgram, readonly: programs.some((program: any) => program.status === "published"), role, profile };
  }

  if (role === "student") {
    const selectedCount = programIds.length ? await prisma.studentProgramSelection.count({
      where: { profileId: profile.id, programId: { in: programIds }, status: "active" }
    }) : 0;
    return { entitled: selectedCount > 0, readonly: false, role, profile };
  }

  const link = await prisma.parentStudentLink.findFirst({
    where: { parentProfileId: profile.id, status: "active" },
    orderBy: { createdAt: "asc" }
  });
  if (!link) return { entitled: false, readonly: true, role, profile };
  const selectedCount = programIds.length ? await prisma.studentProgramSelection.count({
    where: { profileId: link.studentProfileId, programId: { in: programIds }, status: "active" }
  }) : 0;
  return { entitled: selectedCount > 0, readonly: true, role, profile };
}

function normalizeTutorBatchInput(input: any, tutorProfileId: string, programId?: string | null, existing?: any) {
  const startsAt = parseDate(input.startsAt) || existing?.startsAt || new Date();
  const capacity = Number(input.capacity ?? existing?.capacity ?? 12) || 12;
  const feeType = String(input.feeType ?? existing?.feeType ?? "free") === "paid" ? "paid" : "free";
  return {
    tutorProfileId,
    programId: programId ?? null,
    title: String(input.title ?? existing?.title ?? "").trim(),
    course: String(input.course ?? existing?.course ?? "").trim(),
    subject: String(input.subject ?? existing?.subject ?? "").trim(),
    grade: String(input.grade ?? existing?.grade ?? "").trim(),
    board: String(input.board ?? existing?.board ?? "").trim(),
    mode: String(input.mode ?? existing?.mode ?? "online").trim(),
    schedule: String(input.schedule ?? existing?.schedule ?? "").trim(),
    classroomLocation: stringOrNull(input.classroomLocation) ?? existing?.classroomLocation ?? null,
    onlineLink: stringOrNull(input.onlineLink ?? input.onlineVideoLink) ?? existing?.onlineLink ?? null,
    startsAt,
    capacity,
    status: String(input.status ?? existing?.status ?? "available").trim(),
    feeType,
    feeAmount: feeType === "paid" ? Number(input.feeAmount ?? existing?.feeAmount ?? 0) || 0 : null,
    sourceTag: "app"
  };
}

function readCommunityReactionType(value: unknown): CommunityReactionType {
  const type = String(value ?? "upvote");
  if (type === "helpful" || type === "like") return type;
  return "upvote";
}

function communityThreadInclude(userId?: string | null) {
  return {
    ownerProfile: true,
    ownerUser: { include: { profiles: { take: 1, orderBy: { createdAt: "asc" as const } } } },
    comments: { select: { id: true } },
    reactions: true
  };
}

function communityThreadDetailInclude(userId?: string | null) {
  return {
    ...communityThreadInclude(userId),
    comments: {
      orderBy: { createdAt: "asc" as const },
      include: communityCommentInclude(userId)
    }
  };
}

function communityCommentInclude(_userId?: string | null) {
  return {
    ownerProfile: true,
    ownerUser: { include: { profiles: { take: 1, orderBy: { createdAt: "asc" as const } } } },
    reactions: true
  };
}

async function getParentChildProfileIds(userId?: string | null) {
  if (!userId) return [];
  const parent = await findProfile("parent", userId);
  if (!parent) return [];
  try {
    await ensureParentStudentFixture();
    const links = await prisma.parentStudentLink.findMany({
      where: { parentProfileId: parent.id, status: "active" },
      select: { studentProfileId: true }
    });
    return links.map((link) => link.studentProfileId);
  } catch (error) {
    if (isMissingParentLinkTable(error)) return [];
    throw error;
  }
}

function reactionCounts(reactions: Array<{ type: CommunityReactionType | string }>) {
  return reactions.reduce((counts, reaction) => {
    if (reaction.type === "helpful") counts.helpful += 1;
    else if (reaction.type === "like") counts.like += 1;
    else counts.upvote += 1;
    return counts;
  }, { upvote: 0, helpful: 0, like: 0 });
}

function myReactions(reactions: Array<{ type: CommunityReactionType | string; userId: string }>, userId?: string | null): CommunityReactionType[] {
  if (!userId) return [];
  return reactions
    .filter((reaction) => reaction.userId === userId)
    .map((reaction) => readCommunityReactionType(reaction.type));
}

function communityAuthor(item: any, anonymous: boolean) {
  const profile = item.ownerProfile ?? item.ownerUser?.profiles?.[0] ?? null;
  const name = profile ? profile.firstName + " " + profile.lastName : "myTution user";
  const initials = profile ? (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase() : "MT";
  return {
    userId: item.ownerUserId,
    profileId: profile?.id ?? null,
    name: anonymous ? "Anonymous Peer" : name,
    initials: anonymous ? "AP" : initials,
    role: profile?.role ?? "student",
    anonymous
  };
}

function toCommunityThread(thread: any, userId?: string | null, includeComments = false) {
  const comments = includeComments && Array.isArray(thread.comments)
    ? thread.comments.map((comment: any) => toCommunityComment(comment, userId))
    : undefined;
  return {
    id: thread.id,
    author: communityAuthor(thread, thread.anonymous),
    role: thread.role,
    title: thread.title,
    body: thread.body,
    subject: thread.subject,
    milestoneTitle: thread.milestoneTitle,
    status: thread.status,
    pinned: thread.pinned,
    anonymous: thread.anonymous,
    attachmentUrl: thread.attachmentUrl,
    commentCount: includeComments ? comments?.length ?? 0 : thread.comments?.length ?? 0,
    reactionCounts: reactionCounts(thread.reactions ?? []),
    myReactions: myReactions(thread.reactions ?? [], userId),
    createdAt: thread.createdAt.toISOString(),
    ...(comments ? { comments } : {})
  };
}

function toCommunityComment(comment: any, userId?: string | null) {
  return {
    id: comment.id,
    threadId: comment.threadId,
    author: communityAuthor(comment, comment.anonymous),
    body: comment.body,
    verified: comment.verified,
    anonymous: comment.anonymous,
    reactionCounts: reactionCounts(comment.reactions ?? []),
    myReactions: myReactions(comment.reactions ?? [], userId),
    createdAt: comment.createdAt.toISOString()
  };
}

function toUserListItem(profile: any) {
  return {
    id: profile.userId,
    profileId: profile.id,
    role: profile.role,
    name: profile.firstName + " " + profile.lastName,
    initials: (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase(),
    city: profile.city
  };
}

function classReadyLink(batch: { startsAt: Date; onlineLink?: string | null }) {
  if (!batch.onlineLink) return null;
  const diffMs = batch.startsAt.getTime() - Date.now();
  return diffMs <= 5 * 60 * 1000 && diffMs >= -2 * 60 * 60 * 1000 ? batch.onlineLink : null;
}

function toTutorSearchResult(tutor: any, context: { studentProfileId?: string | null; selectedProgramIds?: Set<string> } = {}) {
  return {
    id: tutor.id,
    tutorProfileId: tutor.id,
    profileId: tutor.profileId,
    name: tutor.profile.firstName + " " + tutor.profile.lastName,
    initials: (tutor.profile.firstName.charAt(0) + tutor.profile.lastName.charAt(0)).toUpperCase(),
    headline: tutor.headline,
    subjects: splitCsv(tutor.subjects),
    boards: splitCsv(tutor.boards),
    grades: splitCsv(tutor.grades),
    languages: splitCsv(tutor.languages),
    mode: splitCsv(tutor.mode),
    experienceYears: tutor.experienceYears,
    rating: tutor.rating,
    hourlyRate: tutor.hourlyRate,
    gender: tutor.gender,
    location: tutor.location,
    bio: tutor.bio,
    batches: tutor.batches.map((batch: any) => toBatchSummary(batch, context.studentProfileId)),
    programs: (tutor.profile.authoredPrograms ?? []).map((program: any) => toTutorProgramSummary(program, context.selectedProgramIds)),
    tutionDetails: tutor.batches.map((batch: any) => toTutionDetail(batch, tutor))
  };
}

function marketplaceTutorBrief(tutor: any) {
  const result = toTutorSearchResult(tutor);
  return {
    id: result.id,
    tutorProfileId: result.tutorProfileId,
    profileId: result.profileId,
    name: result.name,
    initials: result.initials,
    headline: result.headline,
    rating: result.rating,
    location: result.location,
    subjects: result.subjects,
    boards: result.boards,
    grades: result.grades,
    languages: result.languages,
    mode: result.mode,
    experienceYears: result.experienceYears,
    hourlyRate: result.hourlyRate
  };
}

function marketplaceFitScore(tutor: any, studentProfile?: any | null) {
  const subjects = splitCsv(tutor.subjects).map((item) => item.toLowerCase());
  const boards = splitCsv(tutor.boards).map((item) => item.toLowerCase());
  const grades = splitCsv(tutor.grades).map((item) => item.toLowerCase());
  const specialization = String(studentProfile?.specialization ?? "").toLowerCase();
  const city = String(studentProfile?.city ?? "").toLowerCase();
  let score = 40 + Math.round((Number(tutor.rating) || 0) * 8) + Math.min(15, Number(tutor.experienceYears) || 0);
  if (specialization && subjects.some((subject) => specialization.includes(subject))) score += 18;
  if (specialization && boards.some((board) => specialization.includes(board))) score += 10;
  if (specialization && grades.some((grade) => specialization.includes(grade.toLowerCase()))) score += 8;
  if (city && String(tutor.location ?? "").toLowerCase().includes(city)) score += 12;
  if (splitCsv(tutor.mode).some((mode) => mode.toLowerCase() === "online")) score += 4;
  if (tutor.verificationStatus === "verified") score += 6;
  return Math.min(100, score);
}

function marketplaceFitReasons(tutor: any, studentProfile?: any | null) {
  const reasons: string[] = [];
  const specialization = String(studentProfile?.specialization ?? "").toLowerCase();
  const city = String(studentProfile?.city ?? "").toLowerCase();
  const matchedSubject = splitCsv(tutor.subjects).find((subject) => specialization.includes(subject.toLowerCase()));
  const matchedBoard = splitCsv(tutor.boards).find((board) => specialization.includes(board.toLowerCase()));
  if (matchedSubject) reasons.push(`${matchedSubject} match`);
  if (matchedBoard) reasons.push(`${matchedBoard} board`);
  if (city && String(tutor.location ?? "").toLowerCase().includes(city)) reasons.push("near your city");
  if ((Number(tutor.rating) || 0) >= 4.5) reasons.push("high rated");
  if ((Number(tutor.experienceYears) || 0) >= 5) reasons.push("experienced tutor");
  if (!reasons.length) reasons.push("popular with students");
  return reasons.slice(0, 3);
}

function toMarketplaceProgram(program: any, tutor: any, fitScore: number, fitReasons: string[], selectedProgramIds?: Set<string>): MarketplaceProgramRecommendation {
  const summary = toTutorProgramSummary(program, selectedProgramIds);
  return {
    ...summary,
    tutor: marketplaceTutorBrief(tutor),
    fitScore,
    fitReasons
  };
}

function toMarketplaceBatch(batch: any, tutor: any, fitScore: number, fitReasons: string[], studentProfileId?: string | null): MarketplaceBatchRecommendation {
  const summary = toBatchSummary(batch, studentProfileId);
  return {
    id: summary.id,
    title: summary.title,
    course: summary.course,
    subject: summary.subject,
    grade: summary.grade,
    board: summary.board,
    mode: summary.mode,
    schedule: summary.schedule,
    classroomLocation: summary.classroomLocation,
    onlineLink: summary.onlineVideoLink,
    startsAt: summary.startsAt,
    capacity: summary.capacity,
    enrolledCount: summary.enrolledCount,
    fillPercent: summary.fillPercent,
    availabilityStatus: summary.availabilityStatus,
    feeType: summary.feeType,
    feeAmount: summary.feeAmount,
    programId: summary.programId,
    tutor: marketplaceTutorBrief(tutor),
    fitScore,
    fitReasons
  };
}

function toUserProfileDetails(profile: any) {
  const tutorProfile = profile.tutorProfile;
  const base = {
    ...toUserListItem(profile),
    firstName: profile.firstName,
    lastName: profile.lastName,
    tutionDetails: []
  };
  if (!tutorProfile) return base;
  return {
    ...base,
    headline: tutorProfile.headline,
    subjects: splitCsv(tutorProfile.subjects),
    boards: splitCsv(tutorProfile.boards),
    grades: splitCsv(tutorProfile.grades),
    languages: splitCsv(tutorProfile.languages),
    mode: splitCsv(tutorProfile.mode),
    experienceYears: tutorProfile.experienceYears,
    rating: tutorProfile.rating,
    hourlyRate: tutorProfile.hourlyRate,
    gender: tutorProfile.gender,
    location: tutorProfile.location,
    bio: tutorProfile.bio,
    batches: tutorProfile.batches.map((batch: any) => toBatchSummary(batch)),
    programs: (profile.authoredPrograms ?? []).map(toTutorProgramSummary),
    tutionDetails: tutorProfile.batches.map((batch: any) => toTutionDetail(batch, tutorProfile))
  };
}

function toTutorProgramSummary(program: any, selectedProgramIds?: Set<string>) {
  const milestones = program.milestones ?? [];
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    status: program.status,
    visibility: program.visibility,
    feeType: program.feeType,
    feeAmount: program.feeAmount,
    milestoneCount: milestones.length,
    activityCount: milestones.reduce((count: number, milestone: any) => count + (milestone.activities?.length ?? 0), 0),
    selected: selectedProgramIds?.has(program.id) ?? undefined
  };
}

function toTutionDetail(batch: any, tutor: any) {
  return {
    id: batch.id,
    subject: batch.subject,
    grade: batch.grade,
    board: batch.board,
    mode: batch.mode,
    course: batch.course,
    schedule: batch.schedule,
    classroomLocation: batch.classroomLocation,
    onlineVideoLink: classReadyLink(batch),
    language: splitCsv(tutor.languages),
    gender: tutor.gender,
    location: tutor.location,
    experienceYears: tutor.experienceYears,
    rating: tutor.rating,
    hourlyRate: tutor.hourlyRate
  };
}

function toBatchSummary(batch: any, studentProfileId?: string | null) {
  const enrolledCount = batch.enrollments?.length ?? 0;
  const studentRequest = studentProfileId ? batch.requests?.find((request: any) => request.studentProfileId === studentProfileId) : null;
  const studentEnrollment = studentProfileId ? batch.enrollments?.find((enrollment: any) => enrollment.studentProfileId === studentProfileId) : null;
  const fillPercent = batch.capacity ? Math.min(100, Math.round((enrolledCount / batch.capacity) * 100)) : 0;
  const availabilityStatus = batch.status === "booked" || batch.status === "archived"
    ? batch.status
    : fillPercent >= 100 ? "booked" : fillPercent >= 70 ? "filling_fast" : batch.status ?? "available";
  return {
    id: batch.id,
    programId: batch.programId ?? null,
    title: batch.title,
    course: batch.course,
    subject: batch.subject,
    grade: batch.grade,
    board: batch.board,
    mode: batch.mode,
    schedule: batch.schedule,
    classroomLocation: batch.classroomLocation,
    startsAt: batch.startsAt.toISOString(),
    capacity: batch.capacity,
    status: batch.status ?? availabilityStatus,
    feeType: batch.feeType ?? "free",
    feeAmount: batch.feeAmount ?? null,
    enrolledCount,
    requestCount: batch.requests?.length ?? 0,
    fillPercent,
    availabilityStatus,
    onlineVideoLink: classReadyLink(batch),
    studentRequestStatus: studentRequest?.status ?? null,
    studentEnrollmentStatus: studentEnrollment?.status ?? null
  };
}

function toBatchRequestSummary(request: any) {
  const tutorProfile = request.batch.tutorProfile;
  return {
    id: request.id,
    status: request.status,
    message: request.message,
    tutorResponse: request.tutorResponse,
    suggestedBatchId: request.suggestedBatchId,
    createdAt: request.createdAt.toISOString(),
    student: {
      id: request.studentProfile.id,
      name: request.studentProfile.firstName + " " + request.studentProfile.lastName,
      city: request.studentProfile.city
    },
    batch: toStudentClass(request.batch),
    tutor: {
      id: tutorProfile.id,
      name: tutorProfile.profile.firstName + " " + tutorProfile.profile.lastName,
      headline: tutorProfile.headline,
      rating: tutorProfile.rating
    },
    timeline: batchRequestTimeline(request)
  };
}

async function enrichBatchRequestSummaries(requests: any[]) {
  const suggestedIds = Array.from(new Set(requests.map((request) => request.suggestedBatchId).filter(Boolean)));
  const suggestedBatches = suggestedIds.length ? await prisma.tutorBatch.findMany({
    where: { id: { in: suggestedIds } },
    include: { tutorProfile: { include: { profile: true } }, enrollments: { include: { studentProfile: true } }, requests: true }
  }) : [];
  const suggestedById = new Map(suggestedBatches.map((batch) => [batch.id, toStudentClass(batch)]));
  return requests.map((request) => ({
    ...toBatchRequestSummary(request),
    suggestedBatch: request.suggestedBatchId ? suggestedById.get(request.suggestedBatchId) ?? null : null
  }));
}

function batchRequestTimeline(request: any) {
  const createdAt = request.createdAt?.toISOString?.() ?? null;
  const isTerminal = ["approved", "rejected", "deferred", "dismissed", "cancelled"].includes(request.status);
  return [
    { key: "requested", label: "Request sent", status: "complete" as const, at: createdAt },
    {
      key: "tutor_review",
      label: request.status === "suggested" ? "Tutor suggested another batch" : request.status === "pending" ? "Tutor review pending" : request.status === "cancelled" ? "Student withdrew request" : "Tutor responded",
      status: request.status === "pending" ? "current" as const : "complete" as const,
      at: request.status === "pending" ? null : request.updatedAt?.toISOString?.() ?? null
    },
    {
      key: "next_step",
      label: request.status === "approved" ? "Enrollment active" : request.status === "suggested" ? "Student action needed" : request.status === "rejected" ? "Request denied" : request.status === "deferred" ? "Deferred for later" : request.status === "cancelled" ? "Withdrawn by student" : request.status === "dismissed" ? "Closed" : "Awaiting result",
      status: isTerminal || request.status === "suggested" ? "current" as const : "pending" as const,
      at: isTerminal ? request.updatedAt?.toISOString?.() ?? null : null
    }
  ];
}

function toStudentClass(batch: any, enrollmentId?: string) {
  const tutorProfile = batch.tutorProfile;
  return {
    id: enrollmentId ?? batch.id,
    batchId: batch.id,
    title: batch.title,
    course: batch.course,
    subject: batch.subject,
    grade: batch.grade,
    board: batch.board,
    mode: batch.mode,
    schedule: batch.schedule,
    classroomLocation: batch.classroomLocation,
    onlineVideoLink: classReadyLink(batch),
    startsAt: batch.startsAt.toISOString(),
    tutorName: tutorProfile.profile.firstName + " " + tutorProfile.profile.lastName,
    tutorHeadline: tutorProfile.headline,
    tutorRating: tutorProfile.rating,
    enrolledStudents: batch.enrollments?.map((enrollment: any) => ({
      id: enrollment.studentProfile.id,
      name: enrollment.studentProfile.firstName + " " + enrollment.studentProfile.lastName,
      city: enrollment.studentProfile.city
    })) ?? []
  };
}

function toTutorBatchClass(batch: any) {
  return {
    ...toStudentClass(batch),
    enrolledStudents: batch.enrollments?.map((enrollment: any) => ({
      id: enrollment.studentProfile.id,
      name: enrollment.studentProfile.firstName + " " + enrollment.studentProfile.lastName,
      city: enrollment.studentProfile.city
    })) ?? [],
    pendingRequests: batch.requests?.filter((request: any) => request.status === "pending").length ?? 0
  };
}

async function listProgramSummaries(role: Role, profileId?: string | null): Promise<ProgramSummary[]> {
  const selections = profileId
    ? await prisma.studentProgramSelection.findMany({
      where: { profileId, status: "active" },
      select: { programId: true }
    })
    : [];
  const selectedIds = new Set(selections.map((selection) => selection.programId));
  const programs = await prisma.program.findMany({
    where: role === "student"
      ? { OR: [{ role }, { id: { in: Array.from(selectedIds) } }] }
      : { role },
    orderBy: { title: "asc" },
    select: { id: true, role: true, title: true, description: true, status: true, visibility: true, creatorProfileId: true, feeType: true, feeAmount: true }
  });
  if (programs.length) {
    return programs.map((program) => ({ ...program, role: readRole(program.role), selected: selectedIds.has(program.id) }));
  }
  if (role !== "student") return [];
  return medicalProgramCatalog.map(({ milestones: _milestones, ...program }) => ({
    ...program,
    role: "student" as const,
    selected: selectedIds.has(program.id)
  }));
}

async function getEducationPlan(role: Role, userId?: string | null, programId?: string | null) {
  if (!isFeatureEnabled("programSessions", role)) return null;
  let scopedProfile: any = userId ? await findProfile(role, userId) : null;
  let effectiveRole = role;
  if (role === "parent" && scopedProfile) {
    try {
      await ensureParentStudentFixture();
    } catch (error) {
      if (!isMissingParentLinkTable(error)) throw error;
      return fallbackEducationPlan("student", programId);
    }
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentProfileId: scopedProfile.id, status: "active" },
      include: { studentProfile: true },
      orderBy: { createdAt: "asc" }
    });
    if (link?.studentProfile) {
      scopedProfile = link.studentProfile;
      effectiveRole = "student";
    }
  }
  const program = await prisma.program.findFirst({
    where: programId ? { id: programId } : { role: effectiveRole },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
        include: {
          activities: {
            orderBy: { sequence: "asc" },
            include: {
              resource: true,
              progress: scopedProfile ? { where: { profileId: scopedProfile.id } } : false
            }
          }
        }
      },
      progress: true
    }
  });
  if (!program) return fallbackEducationPlan(effectiveRole, programId);
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
        assetUrls: assetUrlsFor(activity.resource),
        status: activity.progress?.[0]?.status ?? "pending"
      }))
    }))
  };
}

function dashboardCards(role: Role, reminderCount: number, completedMilestones: number, recommendationCount: number) {
  if (role === "tutor") {
    return [
      { value: "18", label: "Students", target: "roleHub" },
      { value: "7", label: "Leads", target: "roleHub" },
      { value: "4.8", label: "Rating", target: "ratings" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  if (role === "parent") {
    return [
      { value: "3", label: "Surveys", target: "roleHub" },
      { value: "64%", label: "Progress", target: "sessions" },
      { value: String(recommendationCount), label: "Smart picks", target: "home" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  return [
    { value: "4", label: "Classes", target: "roleHub" },
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
        resources: ["video", "article", "flashcard", "article", "quiz", "quiz"] as ResourceType[],
        activities: [
          { id: `${program.id}-m${sequence}-video`, resourceId: `${program.id}-video`, sequence: 1, type: "video", title: "Concept video: high-yield foundation", description: "An 8-15 minute focused lesson introducing one core concept with diagrams and examples.", status: "pending" },
          { id: `${program.id}-m${sequence}-notes`, resourceId: `${program.id}-article`, sequence: 2, type: "article", title: "Interactive article and micro-notes", description: "Bold keywords, derivations, labeled diagrams, and board-ready summaries.", status: "pending" },
          { id: `${program.id}-m${sequence}-flashcard`, resourceId: `${program.id}-flashcard`, sequence: 3, type: "flashcard", title: "Digital flashcards for active recall", description: "Formulae, reactions, biology labels, units, and definitions for memorization.", status: "pending" },
          { id: `${program.id}-m${sequence}-cheatsheet`, resourceId: `${program.id}-cheatsheet`, sequence: 4, type: "article", title: "Formula and concept cheat sheet", description: "A one-page milestone summary to review before assessment.", status: "pending" },
          { id: `${program.id}-m${sequence}-diagnostic`, resourceId: `${program.id}-quiz`, sequence: 5, type: "quiz", title: "Diagnostic MCQ quiz", description: "5-10 conceptual MCQs to prove readiness.", status: "pending" },
          { id: `${program.id}-m${sequence}-subjective`, resourceId: `${program.id}-board-questions`, sequence: 6, type: "quiz", title: "Board-style subjective questions", description: "Past board-style long answers with topper-style marking guidance.", status: "pending" }
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

function toIdentityProfile(profile: any) {
  return {
    id: profile.id,
    userId: profile.userId,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    initials: `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    dob: profile.dob?.toISOString() ?? null,
    city: profile.city,
    communicationAddress: profile.communicationAddress,
    alternatePhone: profile.alternatePhone,
    avatarUrl: profile.avatarUrl,
    stream: profile.stream,
    specialization: profile.specialization,
    sourceTag: profile.sourceTag,
    profileCompletion: profileCompletionFor(profile),
    tutorProfile: profile.tutorProfile ? {
      id: profile.tutorProfile.id,
      headline: profile.tutorProfile.headline,
      subjects: splitCsv(profile.tutorProfile.subjects),
      boards: splitCsv(profile.tutorProfile.boards),
      grades: splitCsv(profile.tutorProfile.grades),
      languages: splitCsv(profile.tutorProfile.languages),
      mode: splitCsv(profile.tutorProfile.mode),
      experienceYears: profile.tutorProfile.experienceYears,
      rating: profile.tutorProfile.rating,
      hourlyRate: profile.tutorProfile.hourlyRate,
      gender: profile.tutorProfile.gender,
      location: profile.tutorProfile.location,
      bio: profile.tutorProfile.bio,
      verificationStatus: profile.tutorProfile.verificationStatus,
      profileStatus: profile.tutorProfile.profileStatus
    } : null,
    linkedParents: (profile.studentParentLinks ?? []).map((link: any) => ({
      id: link.id,
      relationship: link.relationship,
      status: link.status,
      profileId: link.parentProfileId,
      userId: link.parentProfile?.userId,
      phone: link.parentProfile?.user?.phone,
      name: `${link.parentProfile?.firstName ?? ""} ${link.parentProfile?.lastName ?? ""}`.trim()
    })),
    linkedStudents: (profile.parentStudentLinks ?? []).map((link: any) => ({
      id: link.id,
      relationship: link.relationship,
      status: link.status,
      profileId: link.studentProfileId,
      userId: link.studentProfile?.userId,
      phone: link.studentProfile?.user?.phone,
      name: `${link.studentProfile?.firstName ?? ""} ${link.studentProfile?.lastName ?? ""}`.trim()
    })),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function profileCompletionFor(profile: any) {
  const baseFields = [
    profile.firstName,
    profile.lastName,
    profile.dob,
    profile.city,
    profile.communicationAddress,
    profile.alternatePhone
  ];
  const roleFields = profile.role === "parent"
    ? []
    : [profile.stream, profile.specialization];
  const tutorFields = profile.role === "tutor" && profile.tutorProfile
    ? [
      profile.tutorProfile.headline,
      profile.tutorProfile.subjects?.length,
      profile.tutorProfile.boards?.length,
      profile.tutorProfile.grades?.length,
      profile.tutorProfile.languages?.length,
      profile.tutorProfile.mode?.length,
      profile.tutorProfile.experienceYears,
      profile.tutorProfile.location,
      profile.tutorProfile.bio
    ]
    : [];
  const fields = [...baseFields, ...roleFields, ...tutorFields];
  if (!fields.length) return 0;
  const completed = fields.filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return value > 0;
    return Boolean(value);
  }).length;
  return Math.round((completed / fields.length) * 100);
}

function permissionsForRole(role: Role) {
  if (role === "tutor") {
    return [
      "profile:manage",
      "program:create",
      "program:draft:update",
      "program:publish",
      "batch:create",
      "batch:request:manage",
      "student:progress:view"
    ];
  }
  if (role === "parent") {
    return [
      "child:profile:view",
      "child:program:view",
      "child:progress:view",
      "child:community:view"
    ];
  }
  return [
    "profile:manage",
    "tutor:discover",
    "program:enroll",
    "batch:request:create",
    "activity:complete",
    "parent:invite"
  ];
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

async function ensureSharedTutorFixture() {
  const phone = "+917838920129";
  const passwordHash = await hashPassword("Tutor@123");
  const user = await prisma.user.upsert({
    where: { phone },
    update: { passwordHash, sourceTag: "mock" },
    create: {
      phone,
      passwordHash,
      sourceTag: "mock"
    }
  });
  const existingProfile = await prisma.profile.findFirst({ where: { userId: user.id, role: "tutor" } });
  const profile = existingProfile ? await prisma.profile.update({
    where: { id: existingProfile.id },
    data: {
      firstName: "Kartik",
      lastName: "Sohani",
      city: "Jabalpur",
      communicationAddress: "Jabalpur teaching centre",
      alternatePhone: "7838920129",
      stream: "senior",
      specialization: "CBSE Class 10 Mathematics",
      sourceTag: "mock"
    }
  }) : await prisma.profile.create({
    data: {
      userId: user.id,
      role: "tutor",
      firstName: "Kartik",
      lastName: "Sohani",
      dob: new Date("1988-05-15T00:00:00.000Z"),
      city: "Jabalpur",
      communicationAddress: "Jabalpur teaching centre",
      alternatePhone: "7838920129",
      stream: "senior",
      specialization: "CBSE Class 10 Mathematics",
      sourceTag: "mock"
    }
  });
  await prisma.userManagement.upsert({
    where: { userId_role: { userId: user.id, role: "tutor" } },
    update: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      city: profile.city,
      communicationAddress: profile.communicationAddress,
      alternatePhone: profile.alternatePhone,
      stream: profile.stream,
      specialization: profile.specialization,
      sourceTag: "mock"
    },
    create: {
      userId: user.id,
      role: "tutor",
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob,
      city: profile.city,
      communicationAddress: profile.communicationAddress,
      alternatePhone: profile.alternatePhone,
      stream: profile.stream,
      specialization: profile.specialization,
      sourceTag: "mock"
    }
  });
  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { profileId: profile.id },
    update: {
      headline: "Class 10 board booster",
      subjects: "Mathematics",
      boards: "CBSE",
      grades: "Class 10",
      languages: "English,Hindi",
      mode: "Online,Home Tuition",
      experienceYears: 10,
      rating: 4.8,
      hourlyRate: 800,
      gender: "Male",
      location: "Jabalpur",
      bio: "Board revision, previous-year papers, exam strategy, and structured answer practice.",
      sourceTag: "mock"
    },
    create: {
      profileId: profile.id,
      headline: "Class 10 board booster",
      subjects: "Mathematics",
      boards: "CBSE",
      grades: "Class 10",
      languages: "English,Hindi",
      mode: "Online,Home Tuition",
      experienceYears: 10,
      rating: 4.8,
      hourlyRate: 800,
      gender: "Male",
      location: "Jabalpur",
      bio: "Board revision, previous-year papers, exam strategy, and structured answer practice.",
      sourceTag: "mock"
    }
  });

  await ensureSharedTutorProgram(profile.id, {
    title: "Class 10 board exam free foundation",
    description: "Free starter program with algebra notes, video, flashcards, and a diagnostic quiz.",
    feeType: "free",
    feeAmount: null
  });
  await ensureSharedTutorProgram(profile.id, {
    title: "Class 10 board exam 2 month crash course",
    description: "Paid crash course with weekly milestones for board exam revision and practice.",
    feeType: "paid",
    feeAmount: 2500
  });

  const batches = [
    {
      title: "Class 10 Mathematics weekday batch",
      course: "CBSE Mathematics foundation",
      mode: "Online",
      schedule: "Mon, Wed, Fri • 6:00 PM",
      classroomLocation: null,
      onlineLink: "https://meet.mytution.test/kartik-weekday",
      startsAt: new Date("2026-07-06T12:30:00.000Z"),
      capacity: 2,
      fillCount: 2
    },
    {
      title: "Mathematics weekend booster",
      course: "Mathematics exam practice",
      mode: "Online",
      schedule: "Sat, Sun • 10:00 AM",
      classroomLocation: null,
      onlineLink: "https://meet.mytution.test/kartik-weekend",
      startsAt: new Date("2026-07-04T04:30:00.000Z"),
      capacity: 5,
      fillCount: 4
    },
    {
      title: "Class 10 Mathematics offline intensive",
      course: "CBSE Mathematics board intensive",
      mode: "Home Tuition",
      schedule: "Tue, Thu • 5:00 PM",
      classroomLocation: "Jabalpur learning studio",
      onlineLink: null,
      startsAt: new Date("2026-07-07T11:30:00.000Z"),
      capacity: 4,
      fillCount: 1
    }
  ];
  for (const batch of batches) {
    const existingBatch = await prisma.tutorBatch.findFirst({ where: { tutorProfileId: tutorProfile.id, title: batch.title } });
    const createdBatch = existingBatch ? await prisma.tutorBatch.update({
      where: { id: existingBatch.id },
      data: {
        course: batch.course,
        subject: "Mathematics",
        grade: "Class 10",
        board: "CBSE",
        mode: batch.mode,
        schedule: batch.schedule,
        classroomLocation: batch.classroomLocation,
        onlineLink: batch.onlineLink,
        startsAt: batch.startsAt,
        capacity: batch.capacity,
        sourceTag: "mock"
      }
    }) : await prisma.tutorBatch.create({
      data: {
        tutorProfileId: tutorProfile.id,
        title: batch.title,
        course: batch.course,
        subject: "Mathematics",
        grade: "Class 10",
        board: "CBSE",
        mode: batch.mode,
        schedule: batch.schedule,
        classroomLocation: batch.classroomLocation,
        onlineLink: batch.onlineLink,
        startsAt: batch.startsAt,
        capacity: batch.capacity,
        sourceTag: "mock"
      }
    });
    await ensureMockBatchEnrollments(createdBatch.id, batch.fillCount);
  }
}

async function ensureParentStudentFixture() {
  const studentPhones = ["+917838920127", "+783890127", "+91783890127"];
  const parentPhone = "+917838920130";
  const studentHash = await hashPassword("Student@123");
  const parentHash = await hashPassword("Parent@123");
  const foundStudent = await prisma.user.findFirst({ where: { phone: { in: studentPhones } } });
  const canonicalStudentPhone = studentPhones[0];
  const canonicalStudentOwner = await prisma.user.findUnique({ where: { phone: canonicalStudentPhone } });
  const studentUser = foundStudent ? await prisma.user.update({
    where: { id: foundStudent.id },
    data: {
      phone: !canonicalStudentOwner || canonicalStudentOwner.id === foundStudent.id ? canonicalStudentPhone : foundStudent.phone,
      passwordHash: studentHash,
      sourceTag: "mock"
    }
  }) : await prisma.user.create({
    data: { phone: canonicalStudentPhone, passwordHash: studentHash, sourceTag: "mock" }
  });
  const parentUser = await prisma.user.upsert({
    where: { phone: parentPhone },
    update: { passwordHash: parentHash, sourceTag: "mock" },
    create: { phone: parentPhone, passwordHash: parentHash, sourceTag: "mock" }
  });

  const existingStudentProfile = await prisma.profile.findFirst({ where: { userId: studentUser.id, role: "student" } });
  const studentProfile = existingStudentProfile ? await prisma.profile.update({
    where: { id: existingStudentProfile.id },
    data: {
      firstName: existingStudentProfile.firstName || "Apoorv",
      lastName: existingStudentProfile.lastName || "Gulati",
      city: existingStudentProfile.city || "Delhi",
      communicationAddress: existingStudentProfile.communicationAddress || "South Delhi",
      stream: existingStudentProfile.stream || "senior",
      specialization: existingStudentProfile.specialization || "CBSE Class 10 Mathematics",
      sourceTag: "mock"
    }
  }) : await prisma.profile.create({
    data: {
      userId: studentUser.id,
      role: "student",
      firstName: "Apoorv",
      lastName: "Gulati",
      dob: new Date("2010-06-24T00:00:00.000Z"),
      city: "Delhi",
      communicationAddress: "South Delhi",
      alternatePhone: "9999999999",
      stream: "senior",
      specialization: "CBSE Class 10 Mathematics",
      sourceTag: "mock"
    }
  });

  const existingParentProfile = await prisma.profile.findFirst({ where: { userId: parentUser.id, role: "parent" } });
  const parentProfile = existingParentProfile ? await prisma.profile.update({
    where: { id: existingParentProfile.id },
    data: {
      firstName: existingParentProfile.firstName || "Sarmishtha",
      lastName: existingParentProfile.lastName || "Gulati",
      city: existingParentProfile.city || "Delhi",
      communicationAddress: existingParentProfile.communicationAddress || "South Delhi",
      sourceTag: "mock"
    }
  }) : await prisma.profile.create({
    data: {
      userId: parentUser.id,
      role: "parent",
      firstName: "Sarmishtha",
      lastName: "Gulati",
      dob: new Date("1984-01-12T00:00:00.000Z"),
      city: "Delhi",
      communicationAddress: "South Delhi",
      alternatePhone: "9999999999",
      sourceTag: "mock"
    }
  });

  for (const profile of [studentProfile, parentProfile]) {
    await prisma.userManagement.upsert({
      where: { userId_role: { userId: profile.userId, role: profile.role } },
      update: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        dob: profile.dob,
        city: profile.city,
        communicationAddress: profile.communicationAddress,
        alternatePhone: profile.alternatePhone,
        avatarUrl: profile.avatarUrl,
        stream: profile.stream,
        specialization: profile.specialization,
        sourceTag: "mock"
      },
      create: {
        userId: profile.userId,
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
        sourceTag: "mock"
      }
    });
  }

  await prisma.parentStudentLink.upsert({
    where: { studentProfileId_parentProfileId: { studentProfileId: studentProfile.id, parentProfileId: parentProfile.id } },
    update: { relationship: "Mother", status: "active", sourceTag: "mock" },
    create: { studentProfileId: studentProfile.id, parentProfileId: parentProfile.id, relationship: "Mother", status: "active", sourceTag: "mock" }
  });

  const code = "013001";
  await prisma.parentActivationCode.upsert({
    where: { code },
    update: { studentUserId: studentUser.id, studentProfileId: studentProfile.id, parentProfileId: parentProfile.id, relationship: "Mother", status: "accepted", acceptedAt: new Date(), sourceTag: "mock" },
    create: { code, studentUserId: studentUser.id, studentProfileId: studentProfile.id, parentProfileId: parentProfile.id, relationship: "Mother", status: "accepted", acceptedAt: new Date(), sourceTag: "mock" }
  });
}

async function ensureSharedTutorProgram(profileId: string, input: { title: string; description: string; feeType: "free" | "paid"; feeAmount: number | null }) {
  const existing = await prisma.program.findFirst({ where: { creatorProfileId: profileId, title: input.title } });
  if (existing) {
    await prisma.program.update({
      where: { id: existing.id },
      data: { description: input.description, visibility: "published", status: "published", feeType: input.feeType, feeAmount: input.feeAmount, sourceTag: "mock" }
    });
    return existing;
  }
  const resources = await Promise.all([
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "video", title: input.title + " concept video", description: "Short lesson explaining the core concept before practice.", sourceUrl: "https://example.com/mytution/class-10-board-program.mp4", storageType: "db", sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "article", title: input.title + " notes", description: "Board-focused micro-notes with formulas, examples, and answer-writing tips.", body: "Revise identities, worked examples, and step-by-step board answer patterns.", storageType: "db", sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "flashcard", title: input.title + " recall cards", description: "Quick active recall cards for identities, terms, and common traps.", storageType: "db", sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "quiz", title: input.title + " diagnostic quiz", description: "Short MCQ check before moving to the next milestone.", storageType: "db", contentJson: { questions: [{ id: "class-10-board-q1", prompt: "Which expression is equal to a^2 - b^2?", options: ["(a + b)(a - b)", "(a - b)^2", "a^2 + b^2", "2ab"], answerIndex: 0, learnMore: "Difference of squares factors into sum and difference terms." }] }, sourceTag: "mock" } })
  ]);
  await prisma.flashcard.createMany({
    data: [
      { resourceId: resources[2].id, sequence: 1, question: "What is (a + b)^2?", answer: "a^2 + 2ab + b^2", sourceTag: "mock" },
      { resourceId: resources[2].id, sequence: 2, question: "What is (a - b)^2?", answer: "a^2 - 2ab + b^2", sourceTag: "mock" },
      { resourceId: resources[2].id, sequence: 3, question: "What should every algebra answer include?", answer: "Formula, substitution, calculation steps, and final statement.", sourceTag: "mock" }
    ]
  });
  const program = await prisma.program.create({
    data: {
      creatorProfileId: profileId,
      role: "tutor",
      title: input.title,
      description: input.description,
      visibility: "published",
      status: "published",
      feeType: input.feeType,
      feeAmount: input.feeAmount,
      sourceTag: "mock",
      milestones: { create: { sequence: 1, title: "Milestone 1: Algebra foundations", sourceTag: "mock" } }
    },
    include: { milestones: true }
  });
  const milestone = program.milestones[0];
  await prisma.milestoneActivity.createMany({
    data: resources.map((resource, index) => ({
      milestoneId: milestone.id,
      resourceId: resource.id,
      sequence: index + 1,
      type: resource.type,
      title: resource.title,
      description: resource.description,
      sourceTag: "mock"
    }))
  });
  return program;
}

async function ensureMockBatchEnrollments(batchId: string, count: number) {
  const existingCount = await prisma.batchEnrollment.count({ where: { batchId } });
  if (existingCount >= count) return;
  for (let index = existingCount; index < count; index += 1) {
    const user = await prisma.user.upsert({
      where: { phone: `+91783894${String(index + 1).padStart(4, "0")}` },
      update: {},
      create: {
        phone: `+91783894${String(index + 1).padStart(4, "0")}`,
        passwordHash: await hashPassword("Password@123"),
        sourceTag: "mock"
      }
    });
    const existingProfile = await prisma.profile.findFirst({ where: { userId: user.id, role: "student" } });
    const profile = existingProfile ?? await prisma.profile.create({
      data: {
        userId: user.id,
        role: "student",
        firstName: ["Riya", "Kabir", "Ishaan", "Tara", "Aarav"][index] ?? `Student${index + 1}`,
        lastName: ["Mehta", "Arora", "Bedi", "Joshi", "Singh"][index] ?? "Learner",
        city: "Jabalpur",
        communicationAddress: "Jabalpur",
        stream: "senior",
        specialization: "CBSE Class 10 Mathematics",
        sourceTag: "mock"
      }
    });
    await prisma.batchEnrollment.upsert({
      where: { batchId_studentProfileId: { batchId, studentProfileId: profile.id } },
      update: { status: "active" },
      create: { batchId, studentProfileId: profile.id, status: "active", sourceTag: "mock" }
    });
  }
}

function toRecommendation(item: {
  id: string;
  resourceId?: string | null;
  role: string;
  type: string;
  title: string;
  description: string;
  thumbnailLabel: string;
  content?: {
    thumbnailPath?: string | null;
    bannerPath?: string | null;
    vttPath?: string | null;
    metadataPath?: string | null;
    type?: string | null;
    contentJson?: unknown;
  } | null;
}) {
  return {
    id: item.resourceId ?? item.id,
    role: item.role,
    type: item.type,
    title: item.title,
    description: item.description,
    thumbnailLabel: item.thumbnailLabel,
    assetUrls: assetUrlsFor(item.content)
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
  const value = String(input ?? "").toLowerCase();
  return value === "tutor" || value === "parent" || value === "student" ? value : "student";
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
  void ensureSharedTutorFixture().catch((error) => {
    console.warn("Shared tutor fixture skipped", error);
  });
  void ensureParentStudentFixture().catch((error) => {
    if (isMissingParentLinkTable(error)) {
      console.warn("Parent/student fixture skipped until parent activation migration is applied");
      return;
    }
    console.warn("Parent/student fixture skipped", error);
  });
});
