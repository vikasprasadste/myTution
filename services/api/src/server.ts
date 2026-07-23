import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { Prisma } from "@prisma/client";
import { featureFlags, isFeatureEnabled, paletteConfig, roleThemes } from "@mytution/config";
import { prisma } from "@mytution/db";
import type { CommunityReactionType, ConsentAssignmentActor, ConsentAssignmentSummary, ConsentDocumentSummary, ConsentEffectivePermissionsResponse, ConsentRequirementResponse, CurriculumCatalogueResponse, CurriculumSelection, MarketplaceBatchRecommendation, MarketplaceProgramRecommendation, ProgramSummary, ResourceType, Role, TutorProgramCreateInput, TutorProgramResourceInput } from "@mytution/shared";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const assetsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const curriculumAssetPath = path.join(assetsRoot, "curriculum", "school_boards.json");
const mockOtp = "123456";
const mobileClientId = "mytution_mobile_app";
const isProduction = process.env.NODE_ENV === "production";
const jsonBodyLimit = process.env.API_JSON_BODY_LIMIT ?? "512kb";
const allowedOrigins = splitCsv(process.env.API_ALLOWED_ORIGINS ?? "").filter(Boolean);
const accessTokenTtlMinutes = Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15);
const refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
const maxStaticAssetBytes = Number(process.env.AMS_MAX_STATIC_ASSET_BYTES ?? 25 * 1024 * 1024);
const allowedAssetExtensions = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".vtt", ".md", ".json", ".mp4", ".pdf"]);

let curriculumCatalogueCache: CurriculumCatalogueResponse | null = null;

type ConfigurationSetting<TValue> = {
  key: string;
  folder: string;
  version: number;
  accessLevel: "public" | "private";
  value: TValue;
};

const valuePropsSetting = {
  key: "valueprops",
  folder: "valueprops",
  version: 1,
  accessLevel: "public",
  value: {
    student: [
      {
        id: "find-verified-tutors",
        icon: "🎓",
        title: "Find verified tutors",
        description: "Discover trusted home and online tutors by class, board, language, rating, and availability.",
        imageUrl: "/api/v1/ams/files/valueprops/student/01-find-verified-tutors.png"
      },
      {
        id: "book-trial-classes",
        icon: "🗓",
        title: "Book trial classes",
        description: "Compare tutors, chat safely, and book trial sessions with transparent pricing.",
        imageUrl: "/api/v1/ams/files/valueprops/student/02-book-trial-classes.png"
      },
      {
        id: "learn-with-smart-picks",
        icon: "✨",
        title: "Learn with smart picks",
        description: "Get personalized videos, articles, flashcards, and tutor matches for your goals.",
        imageUrl: "/api/v1/ams/files/valueprops/student/03-learn-with-smart-picks.png"
      }
    ],
    tutor: [
      {
        id: "receive-qualified-leads",
        icon: "📚",
        title: "Receive qualified leads",
        description: "Get matched with students by subject, location, mode, language, and schedule.",
        imageUrl: "/api/v1/ams/files/valueprops/tutor/01-receive-qualified-leads.png"
      },
      {
        id: "run-your-teaching-day",
        icon: "🗓",
        title: "Run your teaching day",
        description: "Manage sessions, reminders, chat, reviews, and availability from one place.",
        imageUrl: "/api/v1/ams/files/valueprops/tutor/02-run-your-teaching-day.png"
      },
      {
        id: "grow-with-trust",
        icon: "₹",
        title: "Grow with trust",
        description: "Build a verified profile, collect ratings, and track payments and payouts.",
        imageUrl: "/api/v1/ams/files/valueprops/tutor/03-grow-with-trust.png"
      }
    ],
    parent: [
      {
        id: "track-learning-clearly",
        icon: "✓",
        title: "Track learning clearly",
        description: "Follow sessions, tutor notes, attendance, and payment activity for your child.",
        imageUrl: "/api/v1/ams/files/valueprops/parent/01-track-learning-clearly.png"
      },
      {
        id: "approve-with-confidence",
        icon: "★",
        title: "Approve with confidence",
        description: "Review tutor trust signals, trial classes, and upcoming reminders before committing.",
        imageUrl: "/api/v1/ams/files/valueprops/parent/02-approve-with-confidence.png"
      },
      {
        id: "stay-on-top-of-classes",
        icon: "🔔",
        title: "Stay on top of classes",
        description: "Use reminders for fees, classes, parent approvals, and study follow-ups.",
        imageUrl: "/api/v1/ams/files/valueprops/parent/03-stay-on-top-of-class.png"
      }
    ]
  }
} satisfies ConfigurationSetting<Record<Role, Array<{ id: string; icon: string; title: string; description: string; imageUrl: string }>>>;

const roleThumbnailsSetting = {
  key: "rolethumbnails",
  folder: "rolethumbnails",
  version: 1,
  accessLevel: "public",
  value: {
    student: {
      title: "Student",
      description: "Discover tutors and book trial classes.",
      imageUrl: "/api/v1/ams/files/rolethumbnails/student.png"
    },
    tutor: {
      title: "Tutor",
      description: "Manage leads, calendar, and payments.",
      imageUrl: "/api/v1/ams/files/rolethumbnails/tutor.png"
    },
    parent: {
      title: "Parent",
      description: "Track classes, payments, and progress.",
      imageUrl: "/api/v1/ams/files/rolethumbnails/parent.png"
    }
  }
} satisfies ConfigurationSetting<Record<Role, { title: string; description: string; imageUrl: string }>>;

const configurationSettings: Record<string, ConfigurationSetting<unknown>> = {
  [valuePropsSetting.key]: valuePropsSetting,
  [roleThumbnailsSetting.key]: roleThumbnailsSetting
};

const defaultRegistrationConsent: ConsentDocumentSummary = {
  id: "consent_registration_v1",
  key: "registration_terms",
  version: "1.0",
  title: "Registration consent",
  description: "Consent required to create a myTution account and use role-specific learning, teaching, and parent monitoring features.",
  documentType: "pdf",
  documentUrl: "/api/v1/ams/files/access-control/consents/mytution-registration-consent-v1.pdf",
  accessLevel: "public",
  roleScope: null,
  required: true,
  status: "active",
  permissionSet: {
    fields: {
      "profile.phone": ["read"],
      "profile.role": ["read"],
      "profile.firstName": ["read", "write"],
      "profile.lastName": ["read", "write"],
      "profile.dob": ["read", "write"],
      "profile.city": ["read", "write"],
      "profile.communicationAddress": ["read", "write"],
      "profile.alternatePhone": ["read", "write"],
      "profile.curriculumSelections": ["read", "write"],
      "profile.stream": ["read", "write"],
      "profile.specialization": ["read", "write"]
    },
    communications: ["otp", "account", "class", "payment", "progress"],
    features: ["registration", "profile", "program", "batch", "parentLink"]
  }
};

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function subjectValues(input: unknown): string[] {
  if (Array.isArray(input)) return uniqueStrings(input);
  if (input && typeof input === "object") {
    return uniqueStrings(Object.values(input as Record<string, unknown>).flatMap((value) => subjectValues(value)));
  }
  return input ? [String(input)] : [];
}

function subjectsForBoard(grade: any, boardId: string): string[] {
  if (grade?.subjects) {
    const subjects = grade.subjects;
    const candidates = [boardId, boardId.replace(/_.*/, ""), boardId.includes("ICSE") ? "ICSE" : "", boardId.includes("IB") ? "IB_PYP" : "", boardId.includes("IGCSE") ? "IGCSE" : "", "State_Boards", "CBSE"];
    for (const key of candidates) {
      if (key && subjects[key]) return subjectValues(subjects[key]);
    }
    return subjectValues(subjects);
  }
  if (grade?.subjects_activities) return subjectValues(grade.subjects_activities);
  if (grade?.streams) return subjectValues(grade.streams);
  return [];
}

function loadCurriculumCatalogue(): CurriculumCatalogueResponse {
  if (curriculumCatalogueCache) return curriculumCatalogueCache;
  const raw = JSON.parse(fs.readFileSync(curriculumAssetPath, "utf8"));
  const grades = Object.values(raw.unified_structure ?? {}).flatMap((stage: any) => (stage.grades ?? []).map((grade: any) => ({ ...grade, stage: stage.stage ?? "School" })));
  const boardIds = uniqueStrings([...(raw.metadata?.boards_included ?? []), ...Object.keys(raw.per_board_breakdown ?? {})]);
  const classes = grades.map((grade: any) => ({
    id: String(grade.grade_id ?? grade.grade_name),
    label: String(grade.grade_name ?? grade.grade_id),
    stage: String(grade.stage ?? "School"),
    subjects: uniqueStrings([subjectsForBoard(grade, "CBSE"), subjectValues(grade.streams)].flat())
  }));
  const boards = boardIds.map((boardId) => {
    const board = raw.per_board_breakdown?.[boardId] ?? {};
    return {
      id: boardId,
      label: boardId.replace(/_/g, " / "),
      fullName: board.full_name ?? null,
      classes: grades.map((grade: any) => ({
        id: String(grade.grade_id ?? grade.grade_name),
        label: String(grade.grade_name ?? grade.grade_id),
        stage: String(grade.stage ?? "School"),
        subjects: subjectsForBoard(grade, boardId)
      }))
    };
  });
  curriculumCatalogueCache = {
    boards,
    classes,
    subjects: uniqueStrings(boards.flatMap((board) => board.classes.flatMap((item) => item.subjects))).sort((a, b) => a.localeCompare(b))
  };
  return curriculumCatalogueCache;
}

function normalizeCurriculumSelections(input: unknown): CurriculumSelection[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((item) => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      board: String(value.board ?? "").trim(),
      classLevel: String(value.classLevel ?? value.grade ?? "").trim(),
      subject: String(value.subject ?? "").trim(),
      stage: stringOrNull(value.stage),
      stream: stringOrNull(value.stream)
    };
  }).filter((item) => item.board && item.classLevel && item.subject);
}

function curriculumSelectionsFromJson(value: unknown): CurriculumSelection[] {
  return normalizeCurriculumSelections(Array.isArray(value) ? value : []);
}

function curriculumJson(selections: CurriculumSelection[] | null | undefined) {
  return selections?.length ? selections as unknown as any : undefined;
}

function profileLabelFromCurriculum(selections: CurriculumSelection[]) {
  const first = selections[0];
  if (!first) return null;
  return `${first.board} ${first.classLevel} ${first.subject}`;
}

function curriculumMatches(selections: CurriculumSelection[], filters: { board?: unknown; grade?: unknown; subject?: unknown }) {
  const board = String(filters.board ?? "").trim().toLowerCase();
  const grade = String(filters.grade ?? "").trim().toLowerCase();
  const subject = String(filters.subject ?? "").trim().toLowerCase();
  if (!board && !grade && !subject) return true;
  return selections.some((item) => {
    const boardHit = !board || item.board.toLowerCase().includes(board) || board.includes(item.board.toLowerCase());
    const gradeHit = !grade || item.classLevel.toLowerCase().includes(grade) || grade.includes(item.classLevel.toLowerCase());
    const subjectHit = !subject || item.subject.toLowerCase().includes(subject) || subject.includes(item.subject.toLowerCase());
    return boardHit && gradeHit && subjectHit;
  });
}

function isMissingParentLinkTable(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
  const table = typeof error === "object" && error !== null && "meta" in error ? (error as { meta?: { table?: string } }).meta?.table : undefined;
  return code === "P2021" && (table === "public.ParentActivationCode" || table === "public.ParentStudentLink");
}

function isMissingAccessControlTable(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
  const table = typeof error === "object" && error !== null && "meta" in error ? (error as { meta?: { table?: string } }).meta?.table : undefined;
  return code === "P2021" && (table === "public.ConsentDocument" || table === "public.UserConsentAcceptance" || table === "public.ConsentAssignment");
}

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function createRateLimiter(input: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const actor = readBearer(req.headers.authorization) ? `token:${crypto.createHash("sha256").update(readBearer(req.headers.authorization) ?? "").digest("hex").slice(0, 16)}` : `ip:${req.ip}`;
    const key = `${input.keyPrefix}:${actor}`;
    const existing = rateLimitBuckets.get(key);
    const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + input.windowMs } : existing;
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);
    res.setHeader("x-ratelimit-limit", String(input.max));
    res.setHeader("x-ratelimit-remaining", String(Math.max(0, input.max - bucket.count)));
    res.setHeader("x-ratelimit-reset", new Date(bucket.resetAt).toISOString());
    if (bucket.count > input.max) {
      res.status(429).json({ error: "Too many requests", requestId: req.headers["x-request-id"] });
      return;
    }
    if (rateLimitBuckets.size > 10_000 && Math.random() < 0.02) {
      for (const [bucketKey, value] of rateLimitBuckets.entries()) {
        if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
    }
    next();
  };
}

function validateStaticAssetRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const decodedPath = decodeURIComponent(req.path);
  const extension = path.extname(decodedPath).toLowerCase();
  if (decodedPath.includes("..") || !allowedAssetExtensions.has(extension)) {
    res.status(403).json({ error: "Unsupported asset request" });
    return;
  }
  const requestedPath = path.resolve(assetsRoot, "." + decodedPath);
  if (!requestedPath.startsWith(assetsRoot)) {
    res.status(403).json({ error: "Unsupported asset request" });
    return;
  }
  const expectedSize = Number(req.header("content-length") ?? 0);
  if (expectedSize > maxStaticAssetBytes) {
    res.status(413).json({ error: "Asset request is too large" });
    return;
  }
  next();
}

type QuizQuestion = { id: string; prompt: string; options: string[]; answerIndex: number; learnMore: string };

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

app.set("trust proxy", 1);
morgan.token("request-id", (req) => String(req.headers["x-request-id"] ?? ""));
app.use((req, res, next) => {
  const requestId = String(req.headers["x-request-id"] ?? crypto.randomUUID());
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"));
  }
}));
app.use(createRateLimiter({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.API_RATE_LIMIT_MAX ?? 240),
  keyPrefix: "api"
}));
app.use("/api/v1/auth", createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
  keyPrefix: "auth"
}));
app.use(express.json({
  limit: jsonBodyLimit,
  type: ["application/json", "application/*+json"]
}));
app.use(morgan(isProduction ? ":method :url :status :response-time ms rid=:request-id" : "dev"));
app.use("/api/v1/ams/files", validateStaticAssetRequest, express.static(assetsRoot, {
  dotfiles: "deny",
  etag: true,
  immutable: isProduction,
  maxAge: isProduction ? "1h" : 0,
  setHeaders: (res) => {
    res.setHeader("x-content-type-options", "nosniff");
  }
}));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "myTution API" });
});

type AssetKind = "thumbnail" | "banner" | "vtt" | "metadata";

function toAssetUrl(assetPath?: string | null) {
  if (!assetPath) return null;
  return `/api/v1/ams/files/${assetPath.replace(/^services\/api\/assets\//, "")}`;
}

function readMediaUrl(resource?: ResourceAssetShape | null) {
  const contentJson = resource?.contentJson;
  if (!contentJson || typeof contentJson !== "object" || !("mediaUrl" in contentJson)) return resource?.sourceUrl ?? null;
  const mediaUrl = contentJson.mediaUrl;
  if (typeof mediaUrl !== "string") return resource?.sourceUrl ?? null;
  return mediaUrl;
}

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
  sourceUrl?: string | null;
  contentJson?: unknown;
};

function assetPathForKind(resource: ResourceAssetShape | null | undefined, kind: AssetKind) {
  if (!resource) return null;
  if (kind === "thumbnail") return normalizeLegacyMockImagePath(resource.thumbnailPath ?? null);
  if (kind === "banner") return normalizeLegacyMockImagePath(resource.bannerPath ?? null);
  if (kind === "vtt") return resource.vttPath ?? null;
  return resource.metadataPath ?? null;
}

function normalizeLegacyMockImagePath(assetPath: string | null) {
  if (!assetPath?.startsWith("services/api/assets/mock/")) return assetPath;
  return assetPath.replace(/\/(thumbnail|banner)\.svg$/i, "/$1.png");
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
    media: readMediaUrl(resource)
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
        learnMore: question.learnMore ?? "Review the linked notes and try the concept again.",
        questionType: question.questionType ?? "single",
        correctOptionIndexes: question.correctOptionIndexes ?? [],
        answerText: question.answerText ?? ""
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
    learnMore: (card as { learnMore?: string | null }).learnMore ?? null,
    relatedArticleId: (card as { relatedArticleId?: string | null }).relatedArticleId ?? null,
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
  const curriculumSelections = role === "parent" ? [] : normalizeCurriculumSelections(profileInput.curriculumSelections);
  const curriculumLabel = profileLabelFromCurriculum(curriculumSelections);
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
  const requiredConsents = await activeConsentRequirements(role);
  const acceptedConsentIds = new Set(
    Array.isArray(req.body.acceptedConsentIds)
      ? req.body.acceptedConsentIds.map((id: unknown) => String(id))
      : []
  );
  const missingConsents = requiredConsents.filter((consent) => consent.required && !acceptedConsentIds.has(consent.id));
  if (missingConsents.length > 0) {
    res.status(400).json({ error: "Required consent is missing" });
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
          specialization: role === "parent" ? null : stringOrNull(profileInput.specialization) ?? curriculumLabel,
          curriculumSelections: role === "parent" ? undefined : curriculumJson(curriculumSelections)
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
        specialization: profile.specialization,
        curriculumSelections: curriculumJson(curriculumSelectionsFromJson(profile.curriculumSelections))
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
      await enqueueNotification(prisma, {
        userId: activation.studentUserId,
        profileId: activation.studentProfileId,
        role: "student",
        type: "parent.invite.accepted",
        title: "Parent linked",
        body: `${profile.firstName} joined as ${activation.relationship}.`,
        data: { parentProfileId: profile.id, relationship: activation.relationship },
        priority: "high"
      });
      await enqueueNotification(prisma, {
        userId: user.id,
        profileId: profile.id,
        role: "parent",
        type: "parent.invite.accepted",
        title: "Student linked",
        body: "You can now track your child's program and class progress.",
        data: { studentProfileId: activation.studentProfileId, relationship: activation.relationship },
        priority: "high"
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
  if (profile && requiredConsents.length > 0) {
    try {
      await prisma.userConsentAcceptance.createMany({
        data: requiredConsents.map((consent) => ({
          userId: user.id,
          profileId: profile.id,
          role,
          consentDocumentId: consent.id,
          consentKey: consent.key,
          consentVersion: consent.version,
          status: "accepted",
          permissionSet: (consent.permissionSet ?? {}) as Prisma.InputJsonValue,
          sourceTag: "app"
        })),
        skipDuplicates: true
      });
    } catch (error) {
      if (!isMissingAccessControlTable(error)) throw error;
    }
  }
  await logAudit({
    userId: user.id,
    profileId: profile?.id,
    role,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    metadata: { acceptedConsentIds: requiredConsents.map((consent) => consent.id) }
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
  if (!user?.passwordHash || user.status !== "active" || !(await verifyPassword(password, user.passwordHash)) || user.profiles.length === 0) {
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

app.post("/api/v1/auth/password/forgot", async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const role = readRole(req.body.role);
  if (!phone) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profiles: { where: { role }, take: 1 } }
  });
  let resetHint: string | undefined;
  if (user?.status === "active" && user.profiles.length > 0) {
    const code = generateSixDigitCode();
    await prisma.passwordResetCode.updateMany({
      where: { userId: user.id, role, status: "active" },
      data: { status: "expired" }
    });
    await prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        role,
        code,
        expiresAt: new Date(Date.now() + 1000 * 60),
        sourceTag: "app"
      }
    });
    resetHint = code;
    await logAudit({
      userId: user.id,
      profileId: user.profiles[0]?.id,
      role,
      action: "auth.password_reset.request",
      entityType: "User",
      entityId: user.id
    });
  }
  res.json({ data: { resetSent: true, expiresInSeconds: 60, resetHint } });
});

app.post("/api/v1/auth/password/reset", async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const role = readRole(req.body.role);
  const code = String(req.body.code ?? "").replace(/\D/g, "").slice(0, 6);
  const password = String(req.body.password ?? "");
  if (!phone || code.length !== 6 || !isValidPassword(password)) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profiles: { where: { role }, take: 1 } }
  });
  if (!user?.passwordHash || user.status !== "active" || user.profiles.length === 0) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }
  const resetCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      role,
      code,
      status: "active",
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!resetCode) {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) }
    });
    await tx.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { status: "used", usedAt: new Date() }
    });
    await tx.passwordResetCode.updateMany({
      where: { userId: user.id, role, status: "active" },
      data: { status: "expired" }
    });
    await tx.authSession.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() }
    });
  });
  await logAudit({
    userId: user.id,
    profileId: user.profiles[0]?.id,
    role,
    action: "auth.password_reset.complete",
    entityType: "User",
    entityId: user.id
  });
  res.json({ data: { passwordReset: true } });
});

app.post("/api/v1/auth/refresh", async (req, res) => {
  const refreshToken = String(req.body.refreshToken ?? "");
  const session = await prisma.authSession.findUnique({ where: { refreshToken }, include: { user: true } });
  if (!session || session.revokedAt || session.refreshTokenExpiresAt < new Date() || session.user.status !== "active") {
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
  const accessControlAssignments = activeProfile
    ? await listConsentAssignmentsForActor({ role: activeProfile.role, userId, profileId: activeProfile.id })
    : [];
  const accessControlPermissions = accessControlAssignments.reduce<Record<string, unknown>>((merged, assignment) => mergePermissionSets(merged, assignment.permissionSet), {});
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
      permissions: activeProfile ? permissionsForRole(activeProfile.role) : [],
      accessControlPermissions
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
      specialization: link.studentProfile.specialization,
      curriculumSelections: curriculumSelectionsFromJson(link.studentProfile.curriculumSelections)
    }))
  });
});

app.put("/api/v1/identity/student-education-profile", async (req, res) => {
  const profile = await requireProfile(req, res, "student");
  if (!profile) return;
  const curriculumSelections = normalizeCurriculumSelections(req.body.curriculumSelections);
  const data = {
    stream: stringOrNull(req.body.stream) ?? profile.stream,
    specialization: stringOrNull(req.body.specialization) ?? profileLabelFromCurriculum(curriculumSelections) ?? profile.specialization,
    ...(curriculumSelections.length ? { curriculumSelections: curriculumJson(curriculumSelections) } : {}),
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
  const curriculumSelections = normalizeCurriculumSelections(req.body.curriculumSelections);
  if (curriculumSelections.length) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { curriculumSelections: curriculumJson(curriculumSelections), specialization: profileLabelFromCurriculum(curriculumSelections) ?? profile.specialization }
    });
  }
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
      bio: String(req.body.bio ?? ""),
      outreachEnabled: Boolean(req.body.outreachEnabled ?? true),
      outreachPlan: stringOrNull(req.body.outreachPlan) ?? "paid_outreach"
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
      outreachEnabled: Boolean(req.body.outreachEnabled ?? true),
      outreachPlan: stringOrNull(req.body.outreachPlan) ?? "paid_outreach",
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

  const mode = String(req.body.mode ?? req.query.mode ?? "hard");
  const result = mode === "soft"
    ? await softDeleteUser(user.id, "admin.user.soft_delete.by_phone", adminActor(req))
    : await hardDeleteUser(user.id, "admin.user.hard_delete.by_phone", adminActor(req));

  res.json({ data: result });
});

app.get("/api/v1/admin/users", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const query = String(req.query.query ?? "").trim();
  const role = req.query.role ? readRole(req.query.role) : null;
  const status = stringOrNull(req.query.status);
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query ? {
        OR: [
          { phone: textContains(query) },
          { profiles: { some: { firstName: textContains(query) } } },
          { profiles: { some: { lastName: textContains(query) } } },
          { profiles: { some: { city: textContains(query) } } }
        ]
      } : {}),
      ...(role ? { profiles: { some: { role } } } : {})
    },
    include: { profiles: { include: { tutorProfile: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 25) || 25, 100)
  });
  res.json({ data: await Promise.all(users.map(toAdminUserSearchResult)) });
});

app.get("/api/v1/admin/users/:id", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { profiles: { include: { tutorProfile: true } } }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ data: await toAdminUserSearchResult(user) });
});

app.patch("/api/v1/admin/users/:id/status", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const status = String(req.body.status ?? "").trim();
  if (!["active", "suspended", "deleted"].includes(status)) {
    res.status(400).json({ error: "Unsupported user status" });
    return;
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } });
  await prisma.authSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
  await logAudit({
    action: "admin.user.status_update",
    entityType: "User",
    entityId: user.id,
    metadata: { status, reason: stringOrNull(req.body.reason), adminActor: adminActor(req) }
  });
  res.json({ data: { id: user.id, phone: user.phone, status: user.status } });
});

app.delete("/api/v1/admin/users/:id", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const mode = String(req.body.mode ?? req.query.mode ?? "soft");
  const result = mode === "hard"
    ? await hardDeleteUser(req.params.id, "admin.user.hard_delete", adminActor(req))
    : await softDeleteUser(req.params.id, "admin.user.soft_delete", adminActor(req));
  res.json({ data: result });
});

app.get("/api/v1/admin/tutors/verification", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const status = stringOrNull(req.query.status);
  const tutors = await prisma.tutorProfile.findMany({
    where: status ? { verificationStatus: status } : {},
    include: { profile: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 50) || 50, 100)
  });
  res.json({ data: tutors.map(toAdminTutorVerificationSummary) });
});

app.patch("/api/v1/admin/tutors/:id/verification", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const verificationStatus = String(req.body.status ?? "").trim();
  if (!["unverified", "pending", "verified", "rejected", "suspended"].includes(verificationStatus)) {
    res.status(400).json({ error: "Unsupported verification status" });
    return;
  }
  const tutor = await prisma.tutorProfile.update({
    where: { id: req.params.id },
    data: { verificationStatus, profileStatus: verificationStatus === "suspended" ? "suspended" : undefined },
    include: { profile: { include: { user: true } } }
  });
  await prisma.adminReview.upsert({
    where: { entityType_entityId_reviewType: { entityType: "TutorProfile", entityId: tutor.id, reviewType: "tutor_verification" } },
    update: {
      status: ["verified", "rejected", "suspended"].includes(verificationStatus) ? "closed" : "pending",
      decision: verificationStatus,
      reason: stringOrNull(req.body.reason),
      assignedTo: adminActor(req),
      decidedAt: ["verified", "rejected", "suspended"].includes(verificationStatus) ? new Date() : null,
      metadata: { profileId: tutor.profileId }
    },
    create: {
      entityType: "TutorProfile",
      entityId: tutor.id,
      reviewType: "tutor_verification",
      status: ["verified", "rejected", "suspended"].includes(verificationStatus) ? "closed" : "pending",
      decision: verificationStatus,
      reason: stringOrNull(req.body.reason),
      assignedTo: adminActor(req),
      decidedAt: ["verified", "rejected", "suspended"].includes(verificationStatus) ? new Date() : null,
      metadata: { profileId: tutor.profileId },
      sourceTag: "app"
    }
  });
  await logAudit({
    action: "admin.tutor.verification_update",
    entityType: "TutorProfile",
    entityId: tutor.id,
    metadata: { verificationStatus, reason: stringOrNull(req.body.reason), adminActor: adminActor(req) }
  });
  res.json({ data: toAdminTutorVerificationSummary(tutor) });
});

app.get("/api/v1/admin/reviews", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const reviews = await prisma.adminReview.findMany({
    where: {
      ...(req.query.status ? { status: String(req.query.status) } : {}),
      ...(req.query.reviewType ? { reviewType: String(req.query.reviewType) } : {}),
      ...(req.query.entityType ? { entityType: String(req.query.entityType) } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 50) || 50, 100)
  });
  res.json({ data: reviews.map(toAdminReviewSummary) });
});

app.post("/api/v1/admin/reviews", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const entityType = String(req.body.entityType ?? "").trim();
  const entityId = String(req.body.entityId ?? "").trim();
  const reviewType = String(req.body.reviewType ?? "manual_review").trim();
  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType and entityId are required" });
    return;
  }
  const review = await prisma.adminReview.upsert({
    where: { entityType_entityId_reviewType: { entityType, entityId, reviewType } },
    update: {
      status: String(req.body.status ?? "pending"),
      priority: String(req.body.priority ?? "normal"),
      reason: stringOrNull(req.body.reason),
      metadata: req.body.metadata ?? undefined
    },
    create: {
      entityType,
      entityId,
      reviewType,
      status: String(req.body.status ?? "pending"),
      priority: String(req.body.priority ?? "normal"),
      reason: stringOrNull(req.body.reason),
      metadata: req.body.metadata ?? undefined,
      sourceTag: "app"
    }
  });
  await logAudit({
    action: "admin.review.queue",
    entityType,
    entityId,
    metadata: { reviewType, priority: review.priority, adminActor: adminActor(req) }
  });
  res.status(201).json({ data: toAdminReviewSummary(review) });
});

app.post("/api/v1/admin/reviews/:id/decision", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const decision = String(req.body.decision ?? "").trim();
  if (!decision) {
    res.status(400).json({ error: "Decision is required" });
    return;
  }
  const review = await prisma.adminReview.update({
    where: { id: req.params.id },
    data: {
      status: String(req.body.status ?? "closed"),
      decision,
      reason: stringOrNull(req.body.reason),
      assignedTo: adminActor(req),
      decidedAt: new Date()
    }
  });
  await applyAdminReviewDecision(review);
  await logAudit({
    action: "admin.review.decision",
    entityType: review.entityType,
    entityId: review.entityId,
    metadata: { reviewType: review.reviewType, decision, reason: review.reason, adminActor: adminActor(req) }
  });
  res.json({ data: toAdminReviewSummary(review) });
});

app.get("/api/v1/admin/audit", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(req.query.action ? { action: textContains(req.query.action) } : {}),
      ...(req.query.entityType ? { entityType: String(req.query.entityType) } : {}),
      ...(req.query.entityId ? { entityId: String(req.query.entityId) } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 100) || 100, 250)
  });
  res.json({ data: logs.map(toAdminAuditSummary) });
});

app.get("/api/v1/admin/config/features", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const overrides = await prisma.adminConfig.findMany({
    where: { scope: "feature_flags", status: "active" },
    orderBy: { key: "asc" }
  });
  res.json({ data: { defaults: featureFlags, overrides: overrides.map(toAdminConfigSummary) } });
});

app.put("/api/v1/admin/config/features/:key", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const key = String(req.params.key).trim();
  const config = await prisma.adminConfig.upsert({
    where: { key: `feature_flags.${key}` },
    update: {
      value: req.body.value ?? {},
      status: String(req.body.status ?? "active"),
      updatedBy: adminActor(req)
    },
    create: {
      key: `feature_flags.${key}`,
      scope: "feature_flags",
      value: req.body.value ?? {},
      status: String(req.body.status ?? "active"),
      updatedBy: adminActor(req),
      sourceTag: "app"
    }
  });
  await logAudit({
    action: "admin.config.feature_update",
    entityType: "AdminConfig",
    entityId: config.id,
    metadata: { key: config.key, value: config.value as any, status: config.status, adminActor: adminActor(req) }
  });
  res.json({ data: toAdminConfigSummary(config) });
});

function adminActor(req: express.Request) {
  return String(req.header("x-admin-actor") ?? req.header("x-admin-email") ?? "admin_api").trim() || "admin_api";
}

async function softDeleteUser(userId: string, action: string, actor: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "deleted" },
    include: { profiles: true }
  });
  await prisma.authSession.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  await prisma.userManagement.updateMany({ where: { userId }, data: { sourceTag: "admin_deleted" } });
  await prisma.tutorProfile.updateMany({
    where: { profileId: { in: user.profiles.map((profile) => profile.id) } },
    data: { profileStatus: "deleted" }
  });
  await logAudit({
    action,
    entityType: "User",
    entityId: userId,
    metadata: { phone: user.phone, adminActor: actor, mode: "soft" }
  });
  return { userId, phone: user.phone, mode: "soft", status: "deleted", revokedSessions: true };
}

async function hardDeleteUser(userId: string, action: string, actor: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profiles: true } });
  if (!user) throw new Error("User not found");
  const profileIds = user.profiles.map((profile) => profile.id);
  const tutorProfiles = await prisma.tutorProfile.findMany({ where: { profileId: { in: profileIds } }, select: { id: true } });
  const tutorProfileIds = tutorProfiles.map((profile) => profile.id);
  const batchIds = (await prisma.tutorBatch.findMany({ where: { tutorProfileId: { in: tutorProfileIds } }, select: { id: true } })).map((batch) => batch.id);
  const programIds = (await prisma.program.findMany({ where: { creatorProfileId: { in: profileIds } }, select: { id: true } })).map((program) => program.id);
  const resourceIds = (await prisma.resource.findMany({ where: { creatorProfileId: { in: profileIds } }, select: { id: true } })).map((resource) => resource.id);
  const result = await prisma.$transaction(async (tx) => {
    const audit = await tx.auditLog.create({
      data: { action, entityType: "User", entityId: user.id, metadata: { phone: user.phone, adminActor: actor, mode: "hard" }, sourceTag: "app" }
    });
    const communityReports = await tx.communityReport.deleteMany({ where: { OR: [{ reporterUserId: user.id }, { reporterProfileId: { in: profileIds } }] } });
    const communityReactions = await tx.communityReaction.deleteMany({ where: { userId: user.id } });
    const communityComments = await tx.communityComment.deleteMany({ where: { OR: [{ ownerUserId: user.id }, { ownerProfileId: { in: profileIds } }] } });
    const communityThreads = await tx.communityThread.deleteMany({ where: { OR: [{ ownerUserId: user.id }, { ownerProfileId: { in: profileIds } }] } });
    const notifications = await tx.notification.deleteMany({ where: { userId: user.id } });
    const devices = await tx.deviceRegistration.deleteMany({ where: { userId: user.id } });
    const parentCodes = await tx.parentActivationCode.deleteMany({ where: { OR: [{ studentUserId: user.id }, { studentProfileId: { in: profileIds } }, { parentProfileId: { in: profileIds } }] } });
    const parentLinks = await tx.parentStudentLink.deleteMany({ where: { OR: [{ studentProfileId: { in: profileIds } }, { parentProfileId: { in: profileIds } }] } });
    const quizAttempts = await tx.quizAttempt.deleteMany({ where: { profileId: { in: profileIds } } });
    const activityProgress = await tx.activityProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const resourceProgress = await tx.resourceProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const programProgress = await tx.programProgress.deleteMany({ where: { profileId: { in: profileIds } } });
    const studentProgramSelections = await tx.studentProgramSelection.deleteMany({ where: { profileId: { in: profileIds } } });
    const batchEnrollments = await tx.batchEnrollment.deleteMany({ where: { OR: [{ studentProfileId: { in: profileIds } }, { batchId: { in: batchIds } }] } });
    const batchRequests = await tx.batchRequest.deleteMany({ where: { OR: [{ studentProfileId: { in: profileIds } }, { batchId: { in: batchIds } }] } });
    const accounting = await tx.tutorAccountingEntry.deleteMany({ where: { tutorProfileId: { in: tutorProfileIds } } });
    const purchases = await tx.programPurchase.deleteMany({ where: { OR: [{ studentProfileId: { in: profileIds } }, { programId: { in: programIds } }] } });
    const paymentOrders = await tx.paymentOrder.deleteMany({ where: { OR: [{ userId: user.id }, { profileId: { in: profileIds } }, { tutorProfileId: { in: tutorProfileIds } }] } });
    const milestoneActivities = await tx.milestoneActivity.deleteMany({ where: { milestone: { programId: { in: programIds } } } });
    const milestones = await tx.programMilestone.deleteMany({ where: { programId: { in: programIds } } });
    const recommendations = await tx.recommendation.deleteMany({ where: { resourceId: { in: resourceIds } } });
    const flashcards = await tx.flashcard.deleteMany({ where: { resource: { creatorProfileId: { in: profileIds } } } });
    const resources = await tx.resource.deleteMany({ where: { creatorProfileId: { in: profileIds } } });
    const batches = await tx.tutorBatch.deleteMany({ where: { tutorProfileId: { in: tutorProfileIds } } });
    const programs = await tx.program.deleteMany({ where: { id: { in: programIds } } });
    const tutorProfilesDeleted = await tx.tutorProfile.deleteMany({ where: { id: { in: tutorProfileIds } } });
    const reminders = await tx.reminder.deleteMany({ where: { userId: user.id } });
    const userManagement = await tx.userManagement.deleteMany({ where: { userId: user.id } });
    const authSessions = await tx.authSession.deleteMany({ where: { userId: user.id } });
    const profiles = await tx.profile.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
    return {
      userId: user.id,
      phone: user.phone,
      mode: "hard",
      auditId: audit.id,
      deleted: {
        authSessions: authSessions.count,
        reminders: reminders.count,
        notifications: notifications.count,
        devices: devices.count,
        userManagement: userManagement.count,
        parentCodes: parentCodes.count,
        parentLinks: parentLinks.count,
        communityReports: communityReports.count,
        communityReactions: communityReactions.count,
        communityComments: communityComments.count,
        communityThreads: communityThreads.count,
        quizAttempts: quizAttempts.count,
        activityProgress: activityProgress.count,
        resourceProgress: resourceProgress.count,
        studentProgramSelections: studentProgramSelections.count,
        programProgress: programProgress.count,
        batchEnrollments: batchEnrollments.count,
        batchRequests: batchRequests.count,
        paymentOrders: paymentOrders.count,
        purchases: purchases.count,
        accounting: accounting.count,
        recommendations: recommendations.count,
        flashcards: flashcards.count,
        resources: resources.count,
        milestoneActivities: milestoneActivities.count,
        milestones: milestones.count,
        programs: programs.count,
        batches: batches.count,
        tutorProfiles: tutorProfilesDeleted.count,
        profiles: profiles.count,
        users: 1
      }
    };
  });
  return result;
}

async function toAdminUserSearchResult(user: any) {
  const profileIds = user.profiles.map((profile: any) => profile.id);
  const tutorProfileIds = user.profiles.map((profile: any) => profile.tutorProfile?.id).filter(Boolean);
  const [programs, batches, batchRequests, enrollments, reminders, payments, threads] = await Promise.all([
    prisma.program.count({ where: { creatorProfileId: { in: profileIds } } }),
    prisma.tutorBatch.count({ where: { tutorProfileId: { in: tutorProfileIds } } }),
    prisma.batchRequest.count({ where: { studentProfileId: { in: profileIds } } }),
    prisma.batchEnrollment.count({ where: { studentProfileId: { in: profileIds } } }),
    prisma.reminder.count({ where: { userId: user.id } }),
    prisma.paymentOrder.count({ where: { userId: user.id } }),
    prisma.communityThread.count({ where: { ownerUserId: user.id } })
  ]);
  return {
    id: user.id,
    phone: user.phone,
    status: user.status,
    sourceTag: user.sourceTag,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    profiles: user.profiles.map((profile: any) => ({
      id: profile.id,
      role: profile.role,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      city: profile.city,
      stream: profile.stream,
      specialization: profile.specialization,
      profileStatus: profile.tutorProfile?.profileStatus ?? null,
      verificationStatus: profile.tutorProfile?.verificationStatus ?? null
    })),
    counts: { programs, batches, batchRequests, enrollments, reminders, payments, threads }
  };
}

function toAdminTutorVerificationSummary(tutor: any) {
  return {
    id: tutor.id,
    profileId: tutor.profileId,
    userId: tutor.profile.userId,
    phone: tutor.profile.user?.phone ?? null,
    name: `${tutor.profile.firstName} ${tutor.profile.lastName}`.trim(),
    headline: tutor.headline,
    subjects: splitCsv(tutor.subjects),
    location: tutor.location,
    rating: tutor.rating,
    experienceYears: tutor.experienceYears,
    verificationStatus: tutor.verificationStatus,
    profileStatus: tutor.profileStatus,
    updatedAt: tutor.updatedAt.toISOString()
  };
}

function toAdminReviewSummary(review: any) {
  return {
    id: review.id,
    entityType: review.entityType,
    entityId: review.entityId,
    reviewType: review.reviewType,
    status: review.status,
    priority: review.priority,
    assignedTo: review.assignedTo ?? null,
    decision: review.decision ?? null,
    reason: review.reason ?? null,
    metadata: review.metadata ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    decidedAt: review.decidedAt ? review.decidedAt.toISOString() : null
  };
}

function toAdminConfigSummary(config: any) {
  return {
    id: config.id,
    key: config.key,
    scope: config.scope,
    value: config.value ?? {},
    status: config.status,
    updatedBy: config.updatedBy ?? null,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

function toAdminAuditSummary(log: any) {
  return {
    id: log.id,
    userId: log.userId ?? null,
    profileId: log.profileId ?? null,
    role: log.role ?? null,
    action: log.action,
    entityType: log.entityType ?? null,
    entityId: log.entityId ?? null,
    metadata: log.metadata ?? null,
    createdAt: log.createdAt.toISOString()
  };
}

async function applyAdminReviewDecision(review: any) {
  const decision = String(review.decision ?? "");
  if (review.entityType === "Program" && ["approved", "published", "rejected", "archived"].includes(decision)) {
    await prisma.program.updateMany({
      where: { id: review.entityId },
      data: decision === "approved" || decision === "published"
        ? { status: "published", visibility: "published" }
        : { status: decision }
    });
  }
  if (review.entityType === "TutorBatch" && ["active", "paused", "archived"].includes(decision)) {
    await prisma.tutorBatch.updateMany({ where: { id: review.entityId }, data: { status: decision } });
  }
  if (review.entityType === "CommunityThread" && ["active", "under_review", "removed"].includes(decision)) {
    await prisma.communityThread.updateMany({
      where: { id: review.entityId },
      data: { moderatedStatus: decision, moderatedReason: review.reason }
    });
  }
  if (review.entityType === "CommunityComment" && ["active", "under_review", "removed"].includes(decision)) {
    await prisma.communityComment.updateMany({
      where: { id: review.entityId },
      data: { sourceTag: `admin_${decision}` }
    });
  }
}

function generateActivationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateSixDigitCode() {
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
      where: {
        studentProfileId: profile.id,
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: "desc" },
      include: { parentProfile: true }
    });
    const parents = await prisma.parentStudentLink.findMany({
      where: { studentProfileId: profile.id, status: "active" },
      include: { parentProfile: true },
      orderBy: { createdAt: "asc" }
    });
    res.json({ data: {
      codes: codes.map((item) => ({ id: item.id, code: item.code, relationship: item.relationship, status: item.status, acceptedAt: item.acceptedAt, expiresAt: item.expiresAt })),
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
  await prisma.parentActivationCode.updateMany({
    where: { studentProfileId: student.id, relationship, status: "active" },
    data: { status: "expired" }
  });
  const invite = await prisma.parentActivationCode.create({
    data: {
      code,
      studentUserId: userId,
      studentProfileId: student.id,
      relationship,
      expiresAt: new Date(Date.now() + 1000 * 60),
      sourceTag: "app"
    }
  });
  await enqueueNotification(prisma, {
    userId: student.userId,
    profileId: student.id,
    role: "student",
    type: "parent.invite.generated",
    title: "Parent invite code generated",
    body: `Share ${invite.code} with ${relationship} to link them to your account.`,
    data: { codeId: invite.id, relationship },
    priority: "normal"
  });
  res.status(201).json({ data: { id: invite.id, code: invite.code, relationship: invite.relationship, status: invite.status, expiresAt: invite.expiresAt } });
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

app.get("/api/v1/configuration/settings", (_req, res) => {
  res.json({ data: Object.values(configurationSettings).map((setting) => ({ key: setting.key, folder: setting.folder, version: setting.version, accessLevel: setting.accessLevel })) });
});

app.get("/api/v1/configuration/settings/:key", (req, res) => {
  const setting = configurationSettings[req.params.key];
  if (!setting) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }
  res.json({ data: setting });
});

app.get("/api/v1/access-control/consent-management/requirements", async (req, res) => {
  const role = req.query.role ? readRole(req.query.role) : null;
  const required = await activeConsentRequirements(role);
  res.json({ data: { service: "access-control", module: "consent-management", required } satisfies ConsentRequirementResponse });
});

app.get("/api/v1/access-control/consent-assignments", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const profile = await findProfile(role, userId);
  const assignments = await listConsentAssignmentsForActor({ role, userId, profileId: profile?.id ?? null });
  res.json({ data: assignments.map(toConsentAssignmentSummary) });
});

app.post("/api/v1/access-control/consent-assignments", async (req, res) => {
  const role = readRole(req.body.role ?? req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const assignmentInput = normalizeConsentAssignmentInput(req.body, { role, userId, profileId: profile.id });
  if (!assignmentInput) {
    res.status(400).json({ error: "Valid consent assignment is required" });
    return;
  }
  const consent = await resolveConsentDocumentForAssignment(assignmentInput.consentDocumentId, assignmentInput.consentKey, assignmentInput.consentVersion);
  if (!consent) {
    res.status(404).json({ error: "Consent document not found" });
    return;
  }
  const assignment = await prisma.consentAssignment.create({
    data: {
      consentDocumentId: consent.id,
      consentKey: consent.key,
      consentVersion: consent.version,
      assignerType: assignmentInput.assigner.type,
      assignerRole: assignmentInput.assigner.role ?? null,
      assignerUserId: assignmentInput.assigner.userId ?? null,
      assignerProfileId: assignmentInput.assigner.profileId ?? null,
      assigneeType: assignmentInput.assignee.type,
      assigneeRole: assignmentInput.assignee.role ?? null,
      assigneeUserId: assignmentInput.assignee.userId ?? null,
      assigneeProfileId: assignmentInput.assignee.profileId ?? null,
      status: assignmentInput.status,
      permissionSet: assignmentInput.permissionSet as Prisma.InputJsonValue,
      metadata: assignmentInput.metadata as Prisma.InputJsonValue,
      sourceTag: "app"
    }
  });
  await logAudit({
    userId,
    profileId: profile.id,
    role,
    action: "access_control.consent_assignment.create",
    entityType: "ConsentAssignment",
    entityId: assignment.id,
    metadata: { consentDocumentId: consent.id, assigner: assignmentInput.assigner, assignee: assignmentInput.assignee }
  });
  res.status(201).json({ data: toConsentAssignmentSummary(assignment) });
});

app.get("/api/v1/access-control/consent-assignments/effective-permissions", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const profile = await findProfile(role, userId);
  const assignments = await listConsentAssignmentsForActor({ role, userId, profileId: profile?.id ?? null });
  const permissions = assignments.reduce<Record<string, unknown>>((merged, assignment) => mergePermissionSets(merged, assignment.permissionSet), {});
  res.json({
    data: {
      service: "access-control",
      module: "consent-assignment",
      role,
      userId,
      profileId: profile?.id ?? null,
      permissions,
      assignments: assignments.map(toConsentAssignmentSummary)
    } satisfies ConsentEffectivePermissionsResponse
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
  const context = await getCommunityAccessContext(role, userId);
  if (!context.profile && role !== "parent") {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (role === "parent" && context.childProfileIds.length === 0) {
    res.json({ data: [] });
    return;
  }
  const filters: any[] = [
    communityThreadVisibilityWhere(context),
    { moderatedStatus: "active" }
  ];
  if (status && status !== "all") filters.push({ status });
  if (search) {
    filters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { milestoneTitle: { contains: search, mode: "insensitive" } }
      ]
    });
  }
  const where: any = {
    AND: [
      ...filters
    ]
  };
  const threads = await prisma.communityThread.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: Math.min(Number(req.query.limit) || 50, 100),
    include: communityThreadInclude(userId)
  });
  res.json({ data: threads.map((thread) => toCommunityThread(thread, userId, false, context)) });
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
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const title = String(req.body.title ?? "").trim();
  const body = String(req.body.body ?? "").trim();
  if (!title || !body) {
    res.status(400).json({ error: "Title and body are required" });
    return;
  }
  const programId = stringOrNull(req.body.programId);
  const batchId = stringOrNull(req.body.batchId);
  const visibility = readCommunityVisibility(req.body.visibility, programId, batchId);
  const context = await getCommunityAccessContext(role, userId);
  if (!(await canCreateScopedCommunityThread(context, visibility, programId, batchId))) {
    res.status(403).json({ error: "You cannot create a thread in this program or batch" });
    return;
  }
  const thread = await prisma.communityThread.create({
    data: {
      ownerUserId: userId,
      ownerProfileId: profile?.id,
      programId: visibility === "program" ? programId : null,
      batchId: visibility === "batch" ? batchId : null,
      role,
      visibility,
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
  res.status(201).json({ data: toCommunityThread(thread, userId, false, context) });
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
  if (role) {
    const context = await getCommunityAccessContext(role, userId);
    if (!(await canViewCommunityThread(context, thread))) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    res.json({ data: toCommunityThread(thread, userId, true, context) });
    return;
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
  const context = await getCommunityAccessContext(readRole(current.role), userId);
  res.json({ data: toCommunityThread(thread, userId, false, context) });
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
  const context = await getCommunityAccessContext(role, userId);
  if (!(await canViewCommunityThread(context, thread))) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (thread.status === "archived" || thread.moderatedStatus !== "active") {
    res.status(403).json({ error: "This thread is closed for comments" });
    return;
  }
  const body = String(req.body.body ?? "").trim();
  if (!body) {
    res.status(400).json({ error: "Comment body is required" });
    return;
  }
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
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
  res.status(201).json({ data: toCommunityComment(comment, userId, context) });
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
    const context = role ? await getCommunityAccessContext(role, userId) : null;
    if (context && !(await canViewCommunityThread(context, thread))) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
  }
  if (commentId) {
    const comment = await prisma.communityComment.findUnique({ where: { id: commentId }, include: { thread: true } });
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    const context = role ? await getCommunityAccessContext(role, userId) : null;
    if (context && !(await canViewCommunityThread(context, comment.thread))) {
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

app.post("/api/v1/community/reports", async (req, res) => {
  const role = readRole(req.body.role ?? req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const context = await getCommunityAccessContext(role, userId);
  const threadId = stringOrNull(req.body.threadId);
  const commentId = stringOrNull(req.body.commentId);
  const reason = String(req.body.reason ?? "inappropriate").trim().slice(0, 80) || "inappropriate";
  const details = stringOrNull(req.body.details);
  if ((!threadId && !commentId) || (threadId && commentId)) {
    res.status(400).json({ error: "Provide exactly one report target" });
    return;
  }
  const targetThread = threadId
    ? await prisma.communityThread.findUnique({ where: { id: threadId } })
    : null;
  const targetComment = commentId
    ? await prisma.communityComment.findUnique({ where: { id: commentId }, include: { thread: true } })
    : null;
  const thread = targetThread ?? targetComment?.thread ?? null;
  if (!thread || !(await canViewCommunityThread(context, thread))) {
    res.status(404).json({ error: "Report target not found" });
    return;
  }
  const report = await prisma.communityReport.upsert({
    where: threadId
      ? { reporterUserId_threadId_reason: { reporterUserId: userId, threadId, reason } }
      : { reporterUserId_commentId_reason: { reporterUserId: userId, commentId: commentId as string, reason } },
    update: { details, status: "open" },
    create: {
      reporterUserId: userId,
      reporterProfileId: context.profile?.id ?? null,
      threadId,
      commentId,
      reason,
      details,
      sourceTag: "app"
    }
  });
  const openReports = await prisma.communityReport.count({
    where: {
      status: "open",
      OR: [
        { threadId: thread.id },
        { comment: { threadId: thread.id } }
      ]
    }
  });
  await prisma.communityThread.update({
    where: { id: thread.id },
    data: {
      reportedCount: openReports,
      ...(openReports >= 3 ? { moderatedStatus: "under_review", moderatedReason: "Multiple community reports" } : {})
    }
  });
  res.status(201).json({
    data: {
      id: report.id,
      threadId: report.threadId,
      commentId: report.commentId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString()
    }
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

app.get("/api/v1/usermanagement/curriculum", async (_req, res) => {
  res.json({ data: loadCurriculumCatalogue() });
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

  const curriculumSelections = role === "parent" ? [] : normalizeCurriculumSelections(req.body.curriculumSelections);
  const data = {
    firstName: String(req.body.firstName ?? current.firstName),
    lastName: String(req.body.lastName ?? current.lastName),
    dob: dateOrNull(req.body.dob) ?? current.dob,
    city: stringOrNull(req.body.city) ?? current.city,
    communicationAddress: stringOrNull(req.body.communicationAddress) ?? current.communicationAddress,
    alternatePhone: stringOrNull(req.body.alternatePhone) ?? current.alternatePhone,
    avatarUrl: stringOrNull(req.body.avatarUrl) ?? current.avatarUrl,
    stream: role === "parent" ? null : stringOrNull(req.body.stream) ?? current.stream,
    specialization: role === "parent" ? null : stringOrNull(req.body.specialization) ?? profileLabelFromCurriculum(curriculumSelections) ?? current.specialization,
    ...(role !== "parent" && curriculumSelections.length ? { curriculumSelections: curriculumJson(curriculumSelections) } : {})
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
  const hasCurriculumFilters = Boolean(req.query.subject || req.query.grade || req.query.board);
  if (Object.keys(batchWhere).length && !hasCurriculumFilters) tutorWhere.batches = { some: batchWhere };

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
  const filteredTutors = tutors.filter((tutor) => {
    if (!hasCurriculumFilters) return true;
    const profileMatch = curriculumMatches(curriculumSelectionsFromJson(tutor.profile?.curriculumSelections), req.query);
    const batchMatch = (tutor.batches ?? []).some((batch: any) => curriculumMatches([{ board: batch.board, classLevel: batch.grade, subject: batch.subject }], req.query));
    return profileMatch || batchMatch;
  });
  res.json({ data: filteredTutors.map((tutor) => toTutorSearchResult(tutor, { studentProfileId: studentProfile?.id, selectedProgramIds })) });
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
  if (batch.feeType === "paid" && (batch.feeAmount ?? 0) > 0) {
    const order = await createBatchAdmissionPaymentOrder(student, batch, stringOrNull(req.body.methodType) ?? "upi", stringOrNull(req.body.message));
    res.status(201).json({
      data: {
        paymentRequired: true,
        order: toPaymentOrderSummary(order),
        message: "Payment is required before this batch admission request can be sent."
      }
    });
    return;
  }
  const request = await prisma.batchRequest.upsert({
    where: { batchId_studentProfileId: { batchId, studentProfileId: student.id } },
    update: { status: "pending", message: stringOrNull(req.body.message), sourceTag: "app" },
    create: { batchId, studentProfileId: student.id, message: stringOrNull(req.body.message), sourceTag: "app" },
    include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
  });
  await notifyBatchRequestCreated(prisma, request);
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
    if (request.paymentOrderId) {
      await tx.tutorAccountingEntry.updateMany({
        where: { paymentOrderId: request.paymentOrderId, status: "pending" },
        data: { status: "available" }
      });
    }
    const enrollment = await tx.batchEnrollment.upsert({
      where: { batchId_studentProfileId: { batchId: request.batchId, studentProfileId: request.studentProfileId } },
      update: { status: "active", requestId: request.id },
      create: { batchId: request.batchId, studentProfileId: request.studentProfileId, requestId: request.id, status: "active", sourceTag: "app" }
    });
    await ensureBatchScheduleReminders(tx, request);
    await notifyBatchRequestOutcome(tx, request, "batch.request.approved", "Batch request approved", `${request.batch.title} has been approved and added to your reminders.`);
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
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } }, studentProfile: true } });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const rejected = await prisma.batchRequest.update({ where: { id: request.id }, data: { status: "rejected", tutorResponse: stringOrNull(req.body.message) ?? "Tutor denied this request." } });
  await notifyBatchRequestOutcome(prisma, request, "batch.request.rejected", "Batch request denied", rejected.tutorResponse ?? "Tutor denied this request.");
  res.json({ data: rejected });
});

app.post("/api/v1/usermanagement/batch-requests/:id/defer", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } }, studentProfile: true } });
  if (!request || request.batch.tutorProfile.profileId !== tutor.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const deferred = await prisma.batchRequest.update({ where: { id: request.id }, data: { status: "deferred", tutorResponse: stringOrNull(req.body.message) ?? "Tutor deferred this request for a later slot." } });
  await notifyBatchRequestOutcome(prisma, request, "batch.request.deferred", "Batch request deferred", deferred.tutorResponse ?? "Tutor deferred this request for a later slot.");
  res.json({ data: deferred });
});

app.post("/api/v1/usermanagement/batch-requests/:id/suggest", async (req, res) => {
  const userId = await readUserId(req);
  const tutor = await findProfile("tutor", userId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }
  const request = await prisma.batchRequest.findUnique({ where: { id: req.params.id }, include: { batch: { include: { tutorProfile: true } }, studentProfile: true } });
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
  await notifyBatchRequestOutcome(prisma, { ...request, suggestedBatchId }, "batch.request.suggested", "New batch suggested", suggested.tutorResponse ?? "Tutor suggested another batch.");
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
  await notifyBatchRequestCreated(prisma, result);
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
  const userId = await requireUserId(req, res);
  if (!userId) return;
  res.json({ data: await listReminders(role, userId) });
});

app.post("/api/v1/events-reminders", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
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
  await enqueueNotification(prisma, {
    userId: reminder.userId,
    profileId: reminder.profileId,
    role,
    type: "reminder.created",
    title: "Reminder scheduled",
    body: reminder.title,
    data: { reminderId: reminder.id },
    scheduledAt: reminder.startsAt,
    priority: "normal"
  });
  res.status(201).json({ data: toReminder(reminder) });
});

app.patch("/api/v1/events-reminders/:id", async (req, res) => {
  const role = readRole(req.body.role ?? req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const existing = await prisma.reminder.findFirst({
    where: { id: req.params.id, role, userId, status: "active" }
  });
  if (!existing) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }
  const reminder = await prisma.reminder.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title ? String(req.body.title) : undefined,
      startsAt: req.body.startsAt ? parseDate(req.body.startsAt) : undefined
    }
  });
  await enqueueNotification(prisma, {
    userId: reminder.userId,
    profileId: reminder.profileId,
    role: reminder.role as Role,
    type: "reminder.updated",
    title: "Reminder updated",
    body: reminder.title,
    data: { reminderId: reminder.id },
    scheduledAt: reminder.startsAt,
    priority: "normal"
  });
  res.json({ data: toReminder(reminder) });
});

app.delete("/api/v1/events-reminders/:id", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const existing = await prisma.reminder.findFirst({
    where: { id: req.params.id, role, userId, status: "active" }
  });
  if (!existing) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }
  await prisma.reminder.update({
    where: { id: req.params.id },
    data: { status: "cancelled" }
  });
  res.status(204).send();
});

app.get("/api/v1/reminders", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  res.json({ data: await listReminders(role, userId) });
});

app.get("/api/v1/reminders/sync", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  res.json({ data: await listReminders(role, userId) });
});

app.post("/api/v1/reminders", async (req, res) => {
  req.url = "/api/v1/events-reminders";
  app._router.handle(req, res, () => undefined);
});

app.post("/api/v1/notifications/devices", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const role = readRole(req.body.role);
  const profile = await findProfile(role, userId);
  const pushToken = String(req.body.pushToken ?? "").trim();
  const platform = String(req.body.platform ?? "expo").trim() || "expo";
  const provider = String(req.body.provider ?? "expo").trim() || "expo";
  if (!pushToken) {
    res.status(400).json({ error: "Push token is required" });
    return;
  }
  const registered = await notificationProvider.registerDevice({ pushToken, platform, provider });
  const device = await prisma.deviceRegistration.upsert({
    where: { pushToken },
    update: {
      userId,
      profileId: profile?.id ?? null,
      role,
      platform,
      provider: registered.provider,
      deviceId: String(req.body.deviceId ?? registered.providerDeviceId),
      status: "active",
      sourceTag: "app"
    },
    create: {
      userId,
      profileId: profile?.id ?? null,
      role,
      platform,
      provider: registered.provider,
      pushToken,
      deviceId: String(req.body.deviceId ?? registered.providerDeviceId),
      status: "active",
      sourceTag: "app"
    }
  });
  res.status(201).json({ data: toDeviceRegistrationSummary(device) });
});

app.get("/api/v1/notifications", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const role = readRole(req.query.role);
  const profile = await findProfile(role, userId);
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      role,
      ...(profile ? { OR: [{ profileId: profile.id }, { profileId: null }] } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 20) || 20, 50)
  });
  res.json({ data: notifications.map(toNotificationSummary) });
});

app.post("/api/v1/notifications/:id/read", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId } });
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  const read = await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date(), status: notification.status === "queued" ? "queued" : "read" }
  });
  res.json({ data: toNotificationSummary(read) });
});

app.post("/api/v1/notifications/read-all", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const role = readRole(req.body.role ?? req.query.role);
  await prisma.notification.updateMany({
    where: { userId, role, readAt: null },
    data: { readAt: new Date(), status: "read" }
  });
  res.json({ data: { success: true } });
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

app.get("/api/v1/education-plan/progress-summary", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const requestedProgramId = stringOrNull(req.query.programId);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (role === "tutor") {
    const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
    if (!tutorProfile) {
      res.json({ data: [] });
      return;
    }
    const batches = await prisma.tutorBatch.findMany({
      where: { tutorProfileId: tutorProfile.id, ...(requestedProgramId ? { programId: requestedProgramId } : {}) },
      include: { enrollments: { where: { status: "active" }, include: { studentProfile: true } } }
    });
    const programIds = Array.from(new Set(batches.map((batch) => batch.programId).filter((id): id is string => Boolean(id))));
    const profilesById = new Map<string, any>();
    batches.forEach((batch) => batch.enrollments.forEach((enrollment) => profilesById.set(enrollment.studentProfile.id, enrollment.studentProfile)));
    res.json({ data: await buildLearnerProgressSummaries(Array.from(profilesById.values()), programIds) });
    return;
  }

  if (role === "parent") {
    const childProfileIds = await getParentChildProfileIds(userId);
    const children = childProfileIds.length ? await prisma.profile.findMany({ where: { id: { in: childProfileIds } } }) : [];
    const selections = childProfileIds.length ? await prisma.studentProgramSelection.findMany({
      where: { profileId: { in: childProfileIds }, status: "active", ...(requestedProgramId ? { programId: requestedProgramId } : {}) },
      select: { programId: true }
    }) : [];
    const programIds = Array.from(new Set(selections.map((selection) => selection.programId)));
    res.json({ data: await buildLearnerProgressSummaries(children, programIds) });
    return;
  }

  const selections = await prisma.studentProgramSelection.findMany({
    where: { profileId: profile.id, status: "active", ...(requestedProgramId ? { programId: requestedProgramId } : {}) },
    select: { programId: true }
  });
  const programIds = Array.from(new Set(selections.map((selection) => selection.programId)));
  res.json({ data: await buildLearnerProgressSummaries([profile], programIds) });
});

app.get("/api/v1/education-plan/activity-timeline", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const requestedProgramId = stringOrNull(req.query.programId);
  const requestedProfileId = stringOrNull(req.query.profileId);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  let allowedProfileIds: string[] = [];

  if (role === "student") {
    allowedProfileIds = [profile.id];
  } else if (role === "parent") {
    allowedProfileIds = await getParentChildProfileIds(userId);
  } else {
    const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
    const enrollments = tutorProfile ? await prisma.batchEnrollment.findMany({
      where: { status: "active", batch: { tutorProfileId: tutorProfile.id } },
      select: { studentProfileId: true }
    }) : [];
    allowedProfileIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.studentProfileId)));
  }

  if (requestedProfileId) allowedProfileIds = allowedProfileIds.filter((id) => id === requestedProfileId);
  if (!allowedProfileIds.length) {
    res.json({ data: [] });
    return;
  }

  const progress = await prisma.activityProgress.findMany({
    where: {
      profileId: { in: allowedProfileIds },
      ...(requestedProgramId ? { activity: { milestone: { programId: requestedProgramId } } } : {})
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Number(req.query.limit) || 50, 100),
    include: {
      profile: true,
      activity: { include: { milestone: { include: { program: true } }, resource: true } }
    }
  });
  res.json({ data: progress.map(toActivityTimelineItem) });
});

app.get("/api/v1/parent/monitoring", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  if (role !== "parent") {
    res.status(403).json({ error: "Parent monitoring is available only for parent profiles" });
    return;
  }
  const parentProfile = await findProfile("parent", userId);
  if (!parentProfile) {
    res.status(404).json({ error: "Parent profile not found" });
    return;
  }

  const childProfileIds = await getParentChildProfileIds(userId);
  if (!childProfileIds.length) {
    res.json({ data: { children: [] } });
    return;
  }

  const [children, selections, enrollments, latestQuizAttempts, weeklyActivity] = await Promise.all([
    prisma.profile.findMany({ where: { id: { in: childProfileIds } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.studentProgramSelection.findMany({
      where: { profileId: { in: childProfileIds }, status: "active" },
      select: { profileId: true, programId: true }
    }),
    prisma.batchEnrollment.findMany({
      where: { studentProfileId: { in: childProfileIds }, status: "active" },
      include: { studentProfile: true, batch: { include: { tutorProfile: { include: { profile: true } }, enrollments: { include: { studentProfile: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.quizAttempt.findMany({
      where: { profileId: { in: childProfileIds } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { resource: { select: { title: true } } }
    }),
    prisma.activityProgress.findMany({
      where: {
        profileId: { in: childProfileIds },
        status: "complete",
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { updatedAt: "desc" },
      select: { profileId: true, updatedAt: true }
    })
  ]);

  const programIds = Array.from(new Set(selections.map((selection) => selection.programId)));
  const progressSummaries = await buildLearnerProgressSummaries(children, programIds);
  const progressByChild = new Map(progressSummaries.map((summary) => [summary.profileId, summary.programs]));
  const classesByChild = new Map<string, ReturnType<typeof toStudentClass>[]>();
  enrollments.forEach((enrollment) => {
    const current = classesByChild.get(enrollment.studentProfileId) ?? [];
    current.push(toStudentClass(enrollment.batch, enrollment.id));
    classesByChild.set(enrollment.studentProfileId, current);
  });

  const quizByChild = new Map<string, Array<{
    id: string;
    resourceId: string;
    title: string;
    score: number;
    total: number;
    percent: number;
    createdAt: string;
  }>>();
  latestQuizAttempts.forEach((attempt) => {
    const current = quizByChild.get(attempt.profileId) ?? [];
    if (current.length < 5) {
      current.push({
        id: attempt.id,
        resourceId: attempt.resourceId,
        title: attempt.resource?.title ?? "Quiz",
        score: attempt.score,
        total: attempt.total,
        percent: attempt.percent,
        createdAt: attempt.createdAt.toISOString()
      });
      quizByChild.set(attempt.profileId, current);
    }
  });

  const weeklyByChild = new Map<string, { completedActivities: number; latestActivityAt: string | null }>();
  weeklyActivity.forEach((item) => {
    const current = weeklyByChild.get(item.profileId) ?? { completedActivities: 0, latestActivityAt: null };
    current.completedActivities += 1;
    if (!current.latestActivityAt) current.latestActivityAt = item.updatedAt.toISOString();
    weeklyByChild.set(item.profileId, current);
  });

  const data = children.map((child) => {
    const progress = progressByChild.get(child.id) ?? [];
    const classes = classesByChild.get(child.id) ?? [];
    const latestQuiz = quizByChild.get(child.id) ?? [];
    const weekly = weeklyByChild.get(child.id) ?? { completedActivities: 0, latestActivityAt: null };
    const averageQuizPercent = latestQuiz.length
      ? Math.round(latestQuiz.reduce((sum, quiz) => sum + quiz.percent, 0) / latestQuiz.length)
      : null;
    const primaryProgram = progress[0];
    const alerts = [
      ...(primaryProgram && primaryProgram.percent >= 100 ? [{
        id: `${child.id}:program-complete`,
        type: "progress" as const,
        severity: "success" as const,
        title: "Program complete",
        copy: `${child.firstName} has completed ${primaryProgram.title}.`
      }] : []),
      ...(primaryProgram && primaryProgram.percent > 0 && primaryProgram.percent < 100 ? [{
        id: `${child.id}:progress`,
        type: "progress" as const,
        severity: "info" as const,
        title: "Learning is moving",
        copy: `${primaryProgram.completedActivities}/${primaryProgram.totalActivities} activities complete in ${primaryProgram.title}.`
      }] : []),
      ...(latestQuiz[0] ? [{
        id: `${child.id}:quiz`,
        type: "quiz" as const,
        severity: latestQuiz[0].percent >= 60 ? "success" as const : "warning" as const,
        title: "Latest quiz score",
        copy: `${latestQuiz[0].title}: ${latestQuiz[0].percent}%`
      }] : []),
      ...(classes[0] ? [{
        id: `${child.id}:class`,
        type: "class" as const,
        severity: "info" as const,
        title: "Upcoming class",
        copy: `${classes[0].title} with ${classes[0].tutorName}`
      }] : [])
    ].slice(0, 4);

    return {
      profileId: child.id,
      name: `${child.firstName} ${child.lastName}`.trim(),
      city: child.city,
      progress,
      classes,
      latestQuiz,
      weeklySummary: {
        completedActivities: weekly.completedActivities,
        activeClasses: classes.length,
        averageQuizPercent,
        latestActivityAt: weekly.latestActivityAt
      },
      alerts,
      placeholders: {
        attendance: "Attendance tracking coming soon",
        tutorNotes: "Tutor notes coming soon",
        paymentStatus: "Payment status coming soon"
      }
    };
  });

  res.json({ data: { children: data } });
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
  if (program.feeType === "paid" && (program.feeAmount ?? 0) > 0) {
    const purchase = await prisma.programPurchase.findUnique({
      where: { programId_studentProfileId: { programId, studentProfileId: profile.id } }
    });
    if (!purchase || purchase.status !== "active" || purchase.accessStatus !== "active") {
      res.status(402).json({ error: "Payment is required before this program can be added" });
      return;
    }
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
    await enqueueNotification(tx, {
      userId: profile.userId,
      profileId: profile.id,
      role: "student",
      type: "program.activity.ready",
      title: "Your program is ready",
      body: `${program.title} is ready. Start with the first activity when you are free.`,
      data: { programId: program.id },
      priority: "normal"
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
  const order = program.feeType === "paid" && (program.feeAmount ?? 0) > 0
    ? await createProgramPurchasePaymentOrder(profile, program, stringOrNull(req.body.methodType) ?? "upi")
    : null;
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
      status: order ? "payment_required" : "interest_recorded",
      order: order ? toPaymentOrderSummary(order) : null,
      message: order ? "Payment order created for this paid program." : "Purchase interest recorded."
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
  if (await tutorProgramTitleExists(tutor.id, input.title)) {
    res.status(409).json({ error: "Program title already exists for this tutor" });
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
          thumbnailPath: resource.thumbnailPath ?? "",
          bannerPath: resource.bannerPath ?? "",
          vttPath: resource.vttPath ?? "",
          metadataPath: resource.metadataPath ?? "",
          flashcards: (resource.flashcards ?? []).map((card: any) => ({ question: card.question, answer: card.answer, learnMore: card.learnMore ?? "", relatedArticleId: card.relatedArticleId ?? null })),
          quizQuestions: questions.map((question: any) => ({
            prompt: String(question.prompt ?? ""),
            options: Array.isArray(question.options) ? question.options.map(String) : [],
            answerIndex: Number(question.answerIndex ?? 0) || 0,
            learnMore: String(question.learnMore ?? ""),
            questionType: String(question.questionType ?? "single"),
            correctOptionIndexes: Array.isArray(question.correctOptionIndexes) ? question.correctOptionIndexes.map(Number).filter(Number.isFinite) : [],
            answerText: String(question.answerText ?? "")
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

async function tutorProgramTitleExists(tutorId: string, title: string, excludeProgramId?: string) {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  const programs = await prisma.program.findMany({
    where: { creatorProfileId: tutorId, role: "tutor", ...(excludeProgramId ? { id: { not: excludeProgramId } } : {}) },
    select: { title: true }
  });
  return programs.some((program) => program.title.trim().toLowerCase() === normalized);
}

async function nextTutorProgramCopyTitle(tutorId: string, title: string) {
  const baseTitle = `${title.trim()} restored`;
  const programs = await prisma.program.findMany({
    where: { creatorProfileId: tutorId, role: "tutor" },
    select: { title: true }
  });
  const existing = new Set(programs.map((program) => program.title.trim().toLowerCase()));
  if (!existing.has(baseTitle.toLowerCase())) return baseTitle;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseTitle} ${index}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return `${baseTitle} ${Date.now()}`;
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
  if (await tutorProgramTitleExists(tutor.id, input.title, existing.id)) {
    res.status(409).json({ error: "Program title already exists for this tutor" });
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

app.post("/api/v1/education-plan/tutor/programs/:id/restore", async (req, res) => {
  const tutor = await requireProfile(req, res, "tutor");
  if (!tutor) return;
  const archived = await prisma.program.findFirst({
    where: { id: req.params.id, creatorProfileId: tutor.id, role: "tutor", status: "archived" },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
        include: { activities: { orderBy: { sequence: "asc" }, include: { resource: { include: { flashcards: { orderBy: { sequence: "asc" } } } } } } }
      }
    }
  });
  if (!archived) {
    res.status(404).json({ error: "Archived program not found" });
    return;
  }
  const draft = tutorProgramToDraft(archived) as TutorProgramCreateInput;
  const title = await nextTutorProgramCopyTitle(tutor.id, archived.title);
  const program = await prisma.$transaction(async (tx) => {
    const createdProgram = await tx.program.create({
      data: {
        role: "tutor",
        title,
        description: draft.description,
        creatorProfileId: tutor.id,
        visibility: "private",
        status: "draft",
        feeType: draft.feeType ?? "free",
        feeAmount: draft.feeType === "paid" ? draft.feeAmount ?? 0 : null,
        sourceTag: "app"
      }
    });
    await writeTutorProgramTree(tx, createdProgram.id, tutor.id, { ...draft, title, visibility: "private" });
    return tx.program.findUnique({
      where: { id: createdProgram.id },
      include: { milestones: { include: { activities: true }, orderBy: { sequence: "asc" } } }
    });
  });
  await logAudit({
    userId: tutor.userId,
    profileId: tutor.id,
    role: "tutor",
    action: "tutor.program.restore_copy",
    entityType: "Program",
    entityId: program?.id,
    metadata: { sourceProgramId: archived.id }
  });
  res.status(201).json({ data: tutorProgramSummary(program) });
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
  res.json({ data: withAssetUrls(resource, { ...entitlement, accessToken: readRequestAccessToken(req) }) });
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
  res.json({ data: withAssetUrls(resource, { ...entitlement, accessToken: readRequestAccessToken(req) }) });
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
  const role = req.query.role ? readRole(req.query.role) : null;
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
  let checkpoint = null;
  if (resource && role === "student") {
    const userId = await readUserId(req).catch(() => null);
    const profile = userId ? await findProfile("student", userId) : null;
    if (profile) {
      const saved = await prisma.quizCheckpoint.findUnique({
        where: { profileId_resourceId: { profileId: profile.id, resourceId: resource.id } }
      });
      if (saved && !saved.completed) {
        checkpoint = {
          answers: saved.answers,
          submitted: saved.submitted,
          currentIndex: saved.currentIndex,
          completed: saved.completed,
          updatedAt: saved.updatedAt.toISOString()
        };
      }
    }
  }
  res.json({
    data: {
      resourceId: req.params.id,
      title: resource?.title ?? "Diagnostic MCQ quiz",
      description: resource?.description ?? "Answer each question to calculate your score and unlock the next learning step.",
      questions: resourceQuestions ?? quizQuestionBank,
      checkpoint
    }
  });
});

app.post("/api/v1/resources/:id/quiz-checkpoint", async (req, res) => {
  const role = readRole(req.body.role);
  if (role !== "student") {
    res.status(403).json({ error: "Only students can save quiz checkpoints" });
    return;
  }
  const userId = await readUserId(req);
  const profile = await findProfile("student", userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: { milestoneActivities: { include: { milestone: { include: { program: true } } } } }
  });
  if (!resource || resource.type !== "quiz") {
    res.status(404).json({ error: "Quiz resource not found" });
    return;
  }
  const entitlement = await resolveResourceEntitlement(req, resource);
  if (!entitlement.entitled || entitlement.readonly) {
    res.status(403).json({ error: "Quiz is not available for this profile" });
    return;
  }
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const submitted = Array.isArray(req.body.submitted) ? req.body.submitted.map(Boolean) : [];
  const currentIndex = Math.max(0, Number(req.body.currentIndex) || 0);
  const completed = Boolean(req.body.completed);
  const checkpoint = await prisma.quizCheckpoint.upsert({
    where: { profileId_resourceId: { profileId: profile.id, resourceId: resource.id } },
    update: { answers, submitted, currentIndex, completed, sourceTag: "app" },
    create: { profileId: profile.id, resourceId: resource.id, answers, submitted, currentIndex, completed, sourceTag: "app" }
  });
  res.json({
    data: {
      answers: checkpoint.answers,
      submitted: checkpoint.submitted,
      currentIndex: checkpoint.currentIndex,
      completed: checkpoint.completed,
      updatedAt: checkpoint.updatedAt.toISOString()
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

app.post("/api/v1/resources/:id/quiz-attempts", async (req, res) => {
  const role = readRole(req.body.role);
  if (role !== "student") {
    res.status(403).json({ error: "Only students can submit quiz attempts" });
    return;
  }
  const userId = await readUserId(req);
  const profile = await findProfile("student", userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id },
    include: { milestoneActivities: { include: { milestone: { include: { program: true } } } } }
  });
  if (!resource || resource.type !== "quiz") {
    res.status(404).json({ error: "Quiz resource not found" });
    return;
  }
  const entitlement = await resolveResourceEntitlement(req, resource);
  if (!entitlement.entitled || entitlement.readonly) {
    res.status(403).json({ error: "Quiz is not available for this profile" });
    return;
  }
  const answers = Array.isArray(req.body.answers) ? req.body.answers.map((answer: unknown) => Number(answer)) : [];
  const total = Math.max(0, Number(req.body.total) || answers.length);
  const score = Math.max(0, Math.min(total, Number(req.body.score) || 0));
  const percent = total ? Math.round((score / total) * 100) : 0;
  const attempt = await prisma.quizAttempt.create({
    data: {
      profileId: profile.id,
      resourceId: resource.id,
      score,
      total,
      percent,
      answers,
      sourceTag: "app"
    }
  });
  await prisma.quizCheckpoint.upsert({
    where: { profileId_resourceId: { profileId: profile.id, resourceId: resource.id } },
    update: { answers, submitted: answers.map(() => true), currentIndex: Math.max(0, total - 1), completed: true, sourceTag: "app" },
    create: { profileId: profile.id, resourceId: resource.id, answers, submitted: answers.map(() => true), currentIndex: Math.max(0, total - 1), completed: true, sourceTag: "app" }
  });
  res.status(201).json({ data: toQuizAttemptSummary(attempt) });
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
    const nextActivity = await tx.milestoneActivity.findFirst({
      where: {
        milestone: {
          programId: activity.milestone.programId,
          sequence: milestoneComplete ? activity.milestone.sequence + 1 : activity.milestone.sequence
        },
        id: { not: activity.id }
      },
      orderBy: { sequence: "asc" }
    });
    if (nextActivity && role === "student") {
      await enqueueNotification(tx, {
        userId: profile.userId,
        profileId: profile.id,
        role: "student",
        type: "program.activity.next",
        title: milestoneComplete ? "Next milestone unlocked" : "Continue your activity",
        body: milestoneComplete ? "A new milestone is ready in your program." : "Your next activity is ready.",
        data: { programId: activity.milestone.programId, milestoneId: nextActivity.milestoneId, activityId: nextActivity.id },
        priority: "normal"
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
  const [reminders, plan, recommendations, metrics] = await Promise.all([
    listReminders(role, userId),
    getEducationPlan(role, userId, stringOrNull(req.query.programId)),
    prisma.recommendation.count({ where: { role } }),
    dashboardMetrics(role, userId)
  ]);

  res.json({
    data: {
      role,
      cards: dashboardCards(role, reminders.length, plan?.completedMilestoneSequence ?? 0, recommendations, metrics),
      today: reminders[0] ? {
        title: reminders[0].title,
        startsAt: reminders[0].startsAt,
        mode: "Reminder",
        status: reminders[0].status
      } : null
    }
  });
});

app.get("/api/v1/payments/methods", (_req: express.Request, res: express.Response) => {
  res.json({ data: paymentGateway.allowedMethods });
});

app.get("/api/v1/payments/orders", async (req, res) => {
  const role = readRole(req.query.role);
  const userId = await readUserId(req);
  const profile = await findProfile(role, userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (role === "tutor") {
    const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } });
    const [orders, accounting] = await Promise.all([
      tutorProfile ? prisma.paymentOrder.findMany({ where: { tutorProfileId: tutorProfile.id }, orderBy: { createdAt: "desc" }, take: 50 }) : [],
      tutorProfile ? prisma.tutorAccountingEntry.findMany({ where: { tutorProfileId: tutorProfile.id }, orderBy: { createdAt: "desc" }, take: 50 }) : []
    ]);
    res.json({ data: { orders: orders.map(toPaymentOrderSummary), accounting: accounting.map(toTutorAccountingSummary) } });
    return;
  }
  const orders = await prisma.paymentOrder.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ data: { orders: orders.map(toPaymentOrderSummary), accounting: [] } });
});

app.post("/api/v1/payments/orders", async (req, res) => {
  const role = readRole(req.body.role);
  const userId = await requireUserId(req, res);
  if (!userId) return;
  if (role !== "student") {
    res.status(400).json({ error: "Payment order creation is currently available for student purchases only" });
    return;
  }
  const profile = await findProfile("student", userId);
  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }
  const targetType = String(req.body.targetType ?? "");
  if (targetType === "program_purchase") {
    const program = await prisma.program.findFirst({
      where: { id: String(req.body.programId ?? ""), role: "tutor", status: "published", visibility: "published" },
      include: { creatorProfile: { include: { tutorProfile: true } } }
    });
    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }
    const order = await createProgramPurchasePaymentOrder(profile, program, stringOrNull(req.body.methodType) ?? "upi");
    res.status(201).json({ data: toPaymentOrderSummary(order) });
    return;
  }
  if (targetType === "batch_admission") {
    const batch = await prisma.tutorBatch.findUnique({ where: { id: String(req.body.batchId ?? "") } });
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const order = await createBatchAdmissionPaymentOrder(profile, batch, stringOrNull(req.body.methodType) ?? "upi", stringOrNull(req.body.message));
    res.status(201).json({ data: toPaymentOrderSummary(order) });
    return;
  }
  res.status(400).json({ error: "Unsupported payment target type" });
});

app.post("/api/v1/payments/orders/:id/confirm", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const methodType = stringOrNull(req.body.methodType) ?? "upi";
  const order = await prisma.paymentOrder.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Payment order not found" });
    return;
  }
  if (order.status === "paid") {
    res.json({ data: { order: toPaymentOrderSummary(order), alreadyPaid: true } });
    return;
  }
  const gatewayResult = await paymentGateway.confirmPayment(order, methodType);
  const result = await activatePaidOrder(order.id, gatewayResult.gatewayPaymentId, methodType);
  res.json({ data: result });
});

app.post("/api/v1/payments/orders/:id/sync", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const order = await prisma.paymentOrder.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Payment order not found" });
    return;
  }
  const synced = await paymentGateway.syncStatus(order);
  res.json({ data: { order: toPaymentOrderSummary({ ...order, status: synced.status }) } });
});

app.post("/api/v1/payments/orders/:id/cancel", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const order = await prisma.paymentOrder.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Payment order not found" });
    return;
  }
  if (order.status === "paid") {
    res.status(409).json({ error: "Paid orders require refund flow" });
    return;
  }
  const cancelled = await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: "cancelled", cancelReason: stringOrNull(req.body.reason) ?? "User cancelled", cancelledAt: new Date() }
  });
  res.json({ data: toPaymentOrderSummary(cancelled) });
});

app.post("/api/v1/payments/orders/:id/refund", async (req, res) => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const order = await prisma.paymentOrder.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Payment order not found" });
    return;
  }
  const refunded = await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { refundStatus: "requested", metadata: { ...(order.metadata as any ?? {}), refundReason: stringOrNull(req.body.reason) ?? "Requested from app" } }
  });
  res.json({ data: { order: toPaymentOrderSummary(refunded), message: "Refund placeholder recorded. Gateway refund integration will process this later." } });
});

const notificationProvider = {
  provider: "internal",
  async registerDevice(input: { pushToken: string; platform: string; provider: string }) {
    return {
      provider: input.provider || "expo",
      providerDeviceId: crypto.createHash("sha256").update(`${input.platform}:${input.pushToken}`).digest("hex").slice(0, 24)
    };
  },
  async send(notification: { id: string }) {
    return {
      provider: "internal",
      providerMessageId: `internal_${notification.id}`,
      status: "sent"
    };
  }
};

type NotificationInput = {
  userId: string;
  profileId?: string | null;
  role: Role;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  channel?: string;
  priority?: string;
  scheduledAt?: Date | null;
};

async function enqueueNotification(client: any, input: NotificationInput) {
  const scheduledAt = input.scheduledAt ?? null;
  const isScheduled = scheduledAt ? scheduledAt.getTime() > Date.now() : false;
  const notification = await client.notification.create({
    data: {
      userId: input.userId,
      profileId: input.profileId ?? null,
      role: input.role,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? undefined,
      channel: input.channel ?? "in_app",
      provider: notificationProvider.provider,
      status: isScheduled ? "queued" : "sent",
      priority: input.priority ?? "normal",
      scheduledAt,
      sentAt: isScheduled ? null : new Date(),
      sourceTag: "app"
    }
  });
  if (!isScheduled) {
    const delivery = await notificationProvider.send(notification);
    return client.notification.update({
      where: { id: notification.id },
      data: { providerMessageId: delivery.providerMessageId, status: delivery.status }
    });
  }
  return notification;
}

async function notifyBatchRequestCreated(client: any, request: any) {
  const tutorProfile = request.batch?.tutorProfile?.profile;
  if (!tutorProfile) return;
  await enqueueNotification(client, {
    userId: tutorProfile.userId,
    profileId: tutorProfile.id,
    role: "tutor",
    type: "batch.request.created",
    title: "New batch request",
    body: `${request.studentProfile?.firstName ?? "A student"} requested ${request.batch?.title ?? "your batch"}.`,
    data: { batchRequestId: request.id, batchId: request.batchId, studentProfileId: request.studentProfileId },
    priority: "high"
  });
}

async function notifyBatchRequestOutcome(client: any, request: any, type: string, title: string, body: string) {
  const recipients = [{ userId: request.studentProfile.userId, profileId: request.studentProfileId, role: "student" as Role }];
  const parentLinks = await client.parentStudentLink.findMany({
    where: { studentProfileId: request.studentProfileId, status: "active" },
    include: { parentProfile: true }
  });
  for (const link of parentLinks) {
    recipients.push({ userId: link.parentProfile.userId, profileId: link.parentProfileId, role: "parent" as Role });
  }
  await Promise.all(recipients.map((recipient) => enqueueNotification(client, {
    ...recipient,
    type,
    title,
    body,
    data: { batchRequestId: request.id, batchId: request.batchId, suggestedBatchId: request.suggestedBatchId ?? null },
    priority: "high"
  })));
}

const paymentGateway = {
  provider: "mock",
  allowedMethods: [
    { id: "upi_mock", type: "upi", label: "UPI", enabled: true, validation: { upiPattern: "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$" } },
    { id: "card_mock", type: "card", label: "Card", enabled: true, validation: { allowedNetworks: ["visa", "mastercard", "rupay"] } },
    { id: "netbanking_mock", type: "netbanking", label: "Net banking", enabled: true, validation: { allowedBanks: ["hdfc", "icici", "sbi", "axis", "kotak"] } }
  ],
  async createIntent(input: { amount: number; currency: string; targetType: string; targetId: string }) {
    return {
      gatewayProvider: "mock",
      gatewayOrderId: `mock_order_${crypto.randomBytes(12).toString("hex")}`,
      metadata: {
        gateway: "mock",
        targetType: input.targetType,
        targetId: input.targetId,
        amount: input.amount,
        currency: input.currency,
        replaceWith: "paymentGateway.createIntent implementation for Razorpay/Stripe/Cashfree/etc."
      }
    };
  },
  async confirmPayment(order: { id: string; gatewayOrderId: string; amount: number; currency: string }, methodType: string) {
    const allowed = this.allowedMethods.some((method) => method.type === methodType && method.enabled);
    if (!allowed) throw new Error("Unsupported payment method");
    return {
      gatewayPaymentId: `mock_pay_${crypto.randomBytes(12).toString("hex")}`,
      status: "paid",
      methodType,
      paymentRail: methodType
    };
  },
  async syncStatus(order: { status: string }) {
    return { status: order.status };
  }
};

const platformFeeBps = 1000;

async function createProgramPurchasePaymentOrder(profile: any, program: any, methodType: string) {
  const amount = Number(program.feeAmount ?? 0);
  if (amount <= 0) throw new Error("Program is not paid");
  const existing = await prisma.paymentOrder.findFirst({
    where: { profileId: profile.id, targetType: "program_purchase", programId: program.id, status: { in: ["requires_payment", "paid"] } },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;
  const intent = await paymentGateway.createIntent({ amount, currency: "INR", targetType: "program_purchase", targetId: program.id });
  return prisma.paymentOrder.create({
    data: {
      userId: profile.userId,
      profileId: profile.id,
      role: "student",
      targetType: "program_purchase",
      targetId: program.id,
      programId: program.id,
      tutorProfileId: program.creatorProfile?.tutorProfile?.id ?? null,
      amount,
      currency: "INR",
      status: "requires_payment",
      gatewayProvider: intent.gatewayProvider,
      gatewayOrderId: intent.gatewayOrderId,
      methodType,
      paymentRail: methodType,
      metadata: intent.metadata,
      sourceTag: "app"
    }
  });
}

async function createBatchAdmissionPaymentOrder(profile: any, batch: any, methodType: string, message?: string | null) {
  const amount = Number(batch.feeAmount ?? 0);
  if (amount <= 0) throw new Error("Batch is not paid");
  const existing = await prisma.paymentOrder.findFirst({
    where: { profileId: profile.id, targetType: "batch_admission", batchId: batch.id, status: { in: ["requires_payment", "paid"] } },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;
  const intent = await paymentGateway.createIntent({ amount, currency: "INR", targetType: "batch_admission", targetId: batch.id });
  return prisma.paymentOrder.create({
    data: {
      userId: profile.userId,
      profileId: profile.id,
      role: "student",
      targetType: "batch_admission",
      targetId: batch.id,
      batchId: batch.id,
      tutorProfileId: batch.tutorProfileId,
      amount,
      currency: "INR",
      status: "requires_payment",
      gatewayProvider: intent.gatewayProvider,
      gatewayOrderId: intent.gatewayOrderId,
      methodType,
      paymentRail: methodType,
      metadata: { ...(intent.metadata as any), admissionMessage: message ?? null },
      sourceTag: "app"
    }
  });
}

async function activatePaidOrder(orderId: string, gatewayPaymentId: string, methodType: string) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.update({
      where: { id: orderId },
      data: {
        status: "paid",
        gatewayPaymentId,
        methodType,
        paymentRail: methodType,
        paidAt: new Date()
      }
    });
    if (order.targetType === "program_purchase" && order.programId) {
      const purchase = await tx.programPurchase.upsert({
        where: { programId_studentProfileId: { programId: order.programId, studentProfileId: order.profileId } },
        update: { orderId: order.id, status: "active", accessStatus: "active", purchasedAt: new Date() },
        create: { orderId: order.id, programId: order.programId, studentProfileId: order.profileId, status: "active", accessStatus: "active", purchasedAt: new Date(), sourceTag: "app" }
      });
      await tx.studentProgramSelection.upsert({
        where: { profileId_programId: { profileId: order.profileId, programId: order.programId } },
        update: { status: "active", sourceTag: "app" },
        create: { profileId: order.profileId, programId: order.programId, status: "active", sourceTag: "app" }
      });
      await tx.programProgress.upsert({
        where: { profileId_programId: { profileId: order.profileId, programId: order.programId } },
        update: {},
        create: { profileId: order.profileId, programId: order.programId, unlockedMilestoneSequence: 1, completedMilestoneSequence: 0, sourceTag: "app" }
      });
      const profile = await tx.profile.findUnique({ where: { id: order.profileId } });
      const program = await tx.program.findUnique({ where: { id: order.programId } });
      if (profile && program) {
        await enqueueNotification(tx, {
          userId: profile.userId,
          profileId: profile.id,
          role: "student",
          type: "payment.program.unlocked",
          title: "Program unlocked",
          body: `${program.title} has been added to your programs.`,
          data: { programId: program.id, orderId: order.id },
          priority: "high"
        });
      }
      await upsertTutorAccountingEntry(tx, order, "program_purchase", purchase.id, "available");
      return { order, purchase };
    }
    if (order.targetType === "batch_admission" && order.batchId) {
      const request = await tx.batchRequest.upsert({
        where: { batchId_studentProfileId: { batchId: order.batchId, studentProfileId: order.profileId } },
        update: { status: "pending", paymentOrderId: order.id, message: typeof order.metadata === "object" && order.metadata && "admissionMessage" in order.metadata ? String((order.metadata as any).admissionMessage ?? "") : null, sourceTag: "app" },
        create: { batchId: order.batchId, studentProfileId: order.profileId, paymentOrderId: order.id, status: "pending", message: typeof order.metadata === "object" && order.metadata && "admissionMessage" in order.metadata ? String((order.metadata as any).admissionMessage ?? "") : null, sourceTag: "app" },
        include: { batch: { include: { tutorProfile: { include: { profile: true } } } }, studentProfile: true }
      });
      await tx.paymentOrder.update({ where: { id: order.id }, data: { batchRequestId: request.id } });
      await upsertTutorAccountingEntry(tx, order, "batch_admission", request.id, "pending");
      await notifyBatchRequestCreated(tx, request);
      return { order: { ...order, batchRequestId: request.id }, request };
    }
    return { order };
  });
  return {
    ...result,
    order: toPaymentOrderSummary(result.order)
  };
}

async function upsertTutorAccountingEntry(tx: any, order: any, sourceType: string, sourceId: string, status: string) {
  if (!order.tutorProfileId || order.amount <= 0) return null;
  const platformFee = Math.round((order.amount * platformFeeBps) / 10000);
  const netAmount = Math.max(0, order.amount - platformFee);
  const existing = await tx.tutorAccountingEntry.findFirst({ where: { paymentOrderId: order.id, sourceType, sourceId } });
  if (existing) {
    return tx.tutorAccountingEntry.update({
      where: { id: existing.id },
      data: { grossAmount: order.amount, platformFee, netAmount, status }
    });
  }
  return tx.tutorAccountingEntry.create({
    data: {
      tutorProfileId: order.tutorProfileId,
      paymentOrderId: order.id,
      sourceType,
      sourceId,
      grossAmount: order.amount,
      platformFee,
      netAmount,
      currency: order.currency,
      status,
      sourceTag: "app"
    }
  });
}

function toPaymentOrderSummary(order: any) {
  return {
    id: order.id,
    role: order.role,
    targetType: order.targetType,
    targetId: order.targetId,
    programId: order.programId,
    batchId: order.batchId,
    batchRequestId: order.batchRequestId,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    gatewayProvider: order.gatewayProvider,
    gatewayOrderId: order.gatewayOrderId,
    gatewayPaymentId: order.gatewayPaymentId,
    methodType: order.methodType,
    paymentRail: order.paymentRail,
    refundStatus: order.refundStatus,
    cancelReason: order.cancelReason,
    paidAt: order.paidAt?.toISOString?.() ?? null,
    cancelledAt: order.cancelledAt?.toISOString?.() ?? null,
    refundedAt: order.refundedAt?.toISOString?.() ?? null,
    createdAt: order.createdAt.toISOString()
  };
}

function toTutorAccountingSummary(item: any) {
  return {
    id: item.id,
    tutorProfileId: item.tutorProfileId,
    paymentOrderId: item.paymentOrderId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    grossAmount: item.grossAmount,
    platformFee: item.platformFee,
    netAmount: item.netAmount,
    currency: item.currency,
    status: item.status,
    payoutReference: item.payoutReference,
    createdAt: item.createdAt.toISOString()
  };
}

async function createSession(userId: string) {
  const mobileClient = await prisma.mobileClient.upsert({
    where: { clientId: mobileClientId },
    update: { status: "active" },
    create: { clientId: mobileClientId, name: "myTution Mobile App", sourceTag: "app" }
  });
  const accessToken = `access_${crypto.randomBytes(32).toString("hex")}`;
  const refreshToken = `refresh_${crypto.randomBytes(32).toString("hex")}`;
  const accessTokenExpiresAt = addMinutes(accessTokenTtlMinutes);
  const refreshTokenExpiresAt = addDays(refreshTokenTtlDays);
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
  const session = await prisma.authSession.findUnique({ where: { accessToken }, include: { user: true } });
  if (!session || session.revokedAt || session.accessTokenExpiresAt < new Date() || session.user.status !== "active") return null;
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
  if (!userId) return [];
  const reminders = await prisma.reminder.findMany({
    where: { role, userId, status: "active" },
    orderBy: { startsAt: "asc" }
  });
  return reminders.map(toReminder);
}

async function ensureBatchScheduleReminders(tx: any, request: {
  batchId: string;
  studentProfileId: string;
  studentProfile: { userId: string };
  batch: { title: string; startsAt: Date };
}) {
  const sourceTag = `batch:${request.batchId}:schedule`;
  const studentTitle = `Class: ${request.batch.title}`;
  const studentReminder = await upsertReminderBySource(tx, {
    userId: request.studentProfile.userId,
    profileId: request.studentProfileId,
    role: "student",
    title: studentTitle,
    startsAt: request.batch.startsAt,
    sourceTag
  });
  await enqueueNotification(tx, {
    userId: request.studentProfile.userId,
    profileId: request.studentProfileId,
    role: "student",
    type: "batch.class.reminder",
    title: "Class reminder scheduled",
    body: studentTitle,
    data: { reminderId: studentReminder.id, batchId: request.batchId },
    scheduledAt: request.batch.startsAt,
    priority: "normal"
  });

  const parentLinks = await tx.parentStudentLink.findMany({
    where: { studentProfileId: request.studentProfileId, status: "active" },
    include: { parentProfile: true }
  });
  await Promise.all(parentLinks.map(async (link: any) => {
    const reminder = await upsertReminderBySource(tx, {
      userId: link.parentProfile.userId,
      profileId: link.parentProfileId,
      role: "parent",
      title: `Child class: ${request.batch.title}`,
      startsAt: request.batch.startsAt,
      sourceTag
    });
    await enqueueNotification(tx, {
      userId: link.parentProfile.userId,
      profileId: link.parentProfileId,
      role: "parent",
      type: "batch.class.reminder",
      title: "Child class reminder scheduled",
      body: `Child class: ${request.batch.title}`,
      data: { reminderId: reminder.id, batchId: request.batchId, studentProfileId: request.studentProfileId },
      scheduledAt: request.batch.startsAt,
      priority: "normal"
    });
  }));
}

async function upsertReminderBySource(tx: any, input: {
  userId: string;
  profileId: string;
  role: Role;
  title: string;
  startsAt: Date;
  sourceTag: string;
}) {
  const existing = await tx.reminder.findFirst({
    where: {
      profileId: input.profileId,
      startsAt: input.startsAt,
      sourceTag: input.sourceTag
    }
  });
  if (existing) {
    return tx.reminder.update({
      where: { id: existing.id },
      data: { title: input.title, status: "active" }
    });
  }
  return tx.reminder.create({ data: input });
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

function readCommunityVisibility(value: unknown, programId?: string | null, batchId?: string | null) {
  const raw = String(value ?? "").trim();
  if (raw === "batch" || batchId) return "batch";
  if (raw === "program" || programId) return "program";
  return "public";
}

type CommunityAccessContext = Awaited<ReturnType<typeof getCommunityAccessContext>>;

async function getCommunityAccessContext(role: Role, userId?: string | null) {
  const profile = userId ? await findProfile(role, userId) : null;
  const childProfileIds = role === "parent" ? await getParentChildProfileIds(userId) : [];
  const childProgramSelections = childProfileIds.length ? await prisma.studentProgramSelection.findMany({
    where: { profileId: { in: childProfileIds }, status: "active" },
    select: { programId: true }
  }) : [];
  const childBatchEnrollments = childProfileIds.length ? await prisma.batchEnrollment.findMany({
    where: { studentProfileId: { in: childProfileIds }, status: "active" },
    select: { batchId: true }
  }) : [];

  const studentProgramSelections = role === "student" && profile ? await prisma.studentProgramSelection.findMany({
    where: { profileId: profile.id, status: "active" },
    select: { programId: true }
  }) : [];
  const studentBatchEnrollments = role === "student" && profile ? await prisma.batchEnrollment.findMany({
    where: { studentProfileId: profile.id, status: "active" },
    select: { batchId: true, batch: { select: { programId: true } } }
  }) : [];

  const tutorProfile = role === "tutor" && profile ? await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } }) : null;
  const tutorBatches = tutorProfile ? await prisma.tutorBatch.findMany({
    where: { tutorProfileId: tutorProfile.id, status: { not: "archived" } },
    select: { id: true, programId: true }
  }) : [];
  const tutorPrograms = role === "tutor" && profile ? await prisma.program.findMany({
    where: { creatorProfileId: profile.id, status: { not: "archived" } },
    select: { id: true }
  }) : [];

  const selectedProgramIds = Array.from(new Set([
    ...studentProgramSelections.map((item) => item.programId),
    ...studentBatchEnrollments.map((item) => item.batch.programId).filter((id): id is string => Boolean(id))
  ]));
  const enrolledBatchIds = studentBatchEnrollments.map((item) => item.batchId);
  const childProgramIds = Array.from(new Set(childProgramSelections.map((item) => item.programId)));
  const childBatchIds = childBatchEnrollments.map((item) => item.batchId);
  const tutorProgramIds = Array.from(new Set([
    ...tutorPrograms.map((item) => item.id),
    ...tutorBatches.map((item) => item.programId).filter((id): id is string => Boolean(id))
  ]));
  const tutorBatchIds = tutorBatches.map((item) => item.id);

  return {
    role,
    userId: userId ?? null,
    profile,
    profileId: profile?.id ?? null,
    childProfileIds,
    childProgramIds,
    childBatchIds,
    selectedProgramIds,
    enrolledBatchIds,
    tutorProgramIds,
    tutorBatchIds
  };
}

function communityThreadVisibilityWhere(context: CommunityAccessContext) {
  if (context.role === "parent") {
    return {
      role: "student",
      OR: [
        { ownerProfileId: { in: context.childProfileIds } },
        ...(context.childProgramIds.length ? [{ visibility: "program", programId: { in: context.childProgramIds } }] : []),
        ...(context.childBatchIds.length ? [{ visibility: "batch", batchId: { in: context.childBatchIds } }] : [])
      ]
    };
  }
  if (context.role === "tutor") {
    return {
      OR: [
        { role: "tutor", visibility: "public" },
        { ownerProfileId: context.profileId },
        ...(context.tutorProgramIds.length ? [{ visibility: "program", programId: { in: context.tutorProgramIds } }] : []),
        ...(context.tutorBatchIds.length ? [{ visibility: "batch", batchId: { in: context.tutorBatchIds } }] : [])
      ]
    };
  }
  return {
    OR: [
      { role: "student", visibility: "public" },
      { ownerProfileId: context.profileId },
      ...(context.selectedProgramIds.length ? [{ visibility: "program", programId: { in: context.selectedProgramIds } }] : []),
      ...(context.enrolledBatchIds.length ? [{ visibility: "batch", batchId: { in: context.enrolledBatchIds } }] : [])
    ]
  };
}

async function canCreateScopedCommunityThread(context: CommunityAccessContext, visibility: string, programId?: string | null, batchId?: string | null) {
  if (context.role === "parent") return false;
  if (visibility === "public") return true;
  if (visibility === "program") {
    if (!programId) return false;
    return context.role === "tutor"
      ? context.tutorProgramIds.includes(programId)
      : context.selectedProgramIds.includes(programId);
  }
  if (visibility === "batch") {
    if (!batchId) return false;
    return context.role === "tutor"
      ? context.tutorBatchIds.includes(batchId)
      : context.enrolledBatchIds.includes(batchId);
  }
  return false;
}

async function canViewCommunityThread(context: CommunityAccessContext, thread: {
  ownerProfileId?: string | null;
  role: Role | string;
  visibility?: string | null;
  programId?: string | null;
  batchId?: string | null;
  moderatedStatus?: string | null;
}) {
  if (thread.moderatedStatus && thread.moderatedStatus !== "active") {
    return thread.ownerProfileId === context.profileId;
  }
  if (context.role === "parent") {
    if (thread.role !== "student") return false;
    return Boolean(
      thread.ownerProfileId && context.childProfileIds.includes(thread.ownerProfileId)
      || thread.visibility === "program" && thread.programId && context.childProgramIds.includes(thread.programId)
      || thread.visibility === "batch" && thread.batchId && context.childBatchIds.includes(thread.batchId)
    );
  }
  if (thread.ownerProfileId && thread.ownerProfileId === context.profileId) return true;
  if (thread.visibility === "public") return thread.role === context.role;
  if (context.role === "tutor") {
    return Boolean(
      thread.visibility === "program" && thread.programId && context.tutorProgramIds.includes(thread.programId)
      || thread.visibility === "batch" && thread.batchId && context.tutorBatchIds.includes(thread.batchId)
    );
  }
  return Boolean(
    thread.visibility === "program" && thread.programId && context.selectedProgramIds.includes(thread.programId)
    || thread.visibility === "batch" && thread.batchId && context.enrolledBatchIds.includes(thread.batchId)
  );
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
    reactions: true,
    reports: { where: { status: "open" }, select: { id: true } }
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

function toCommunityThread(thread: any, userId?: string | null, includeComments = false, context?: CommunityAccessContext | null) {
  const comments = includeComments && Array.isArray(thread.comments)
    ? thread.comments.map((comment: any) => toCommunityComment(comment, userId, context))
    : undefined;
  const canMutate = Boolean(context && context.role !== "parent" && thread.status !== "archived" && thread.moderatedStatus === "active");
  return {
    id: thread.id,
    author: communityAuthor(thread, thread.anonymous),
    role: thread.role,
    visibility: thread.visibility ?? "public",
    programId: thread.programId ?? null,
    batchId: thread.batchId ?? null,
    title: thread.title,
    body: thread.body,
    subject: thread.subject,
    milestoneTitle: thread.milestoneTitle,
    status: thread.status,
    pinned: thread.pinned,
    anonymous: thread.anonymous,
    attachmentUrl: thread.attachmentUrl,
    reportCount: thread.reportedCount ?? 0,
    moderatedStatus: thread.moderatedStatus ?? "active",
    moderatedReason: thread.moderatedReason ?? null,
    canComment: canMutate,
    canReact: canMutate,
    canReport: Boolean(userId && context),
    commentCount: includeComments ? comments?.length ?? 0 : thread.comments?.length ?? 0,
    reactionCounts: reactionCounts(thread.reactions ?? []),
    myReactions: myReactions(thread.reactions ?? [], userId),
    createdAt: thread.createdAt.toISOString(),
    ...(comments ? { comments } : {})
  };
}

function toCommunityComment(comment: any, userId?: string | null, context?: CommunityAccessContext | null) {
  return {
    id: comment.id,
    threadId: comment.threadId,
    author: communityAuthor(comment, comment.anonymous),
    body: comment.body,
    verified: comment.verified,
    anonymous: comment.anonymous,
    reportCount: comment.reports?.length ?? 0,
    moderatedStatus: comment.thread?.moderatedStatus ?? "active",
    canReport: Boolean(userId && context),
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
    curriculumSelections: curriculumSelectionsFromJson(tutor.profile?.curriculumSelections),
    outreachEnabled: tutor.outreachEnabled,
    outreachPlan: tutor.outreachPlan,
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
  const tutorSelections = curriculumSelectionsFromJson(tutor.profile?.curriculumSelections);
  const studentSelections = curriculumSelectionsFromJson(studentProfile?.curriculumSelections);
  const specialization = String(studentProfile?.specialization ?? "").toLowerCase();
  const city = String(studentProfile?.city ?? "").toLowerCase();
  let score = 40 + Math.round((Number(tutor.rating) || 0) * 8) + Math.min(15, Number(tutor.experienceYears) || 0);
  if (studentSelections.some((selection) => curriculumMatches(tutorSelections, { board: selection.board, grade: selection.classLevel, subject: selection.subject }))) score += 28;
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
  const tutorSelections = curriculumSelectionsFromJson(tutor.profile?.curriculumSelections);
  const studentSelections = curriculumSelectionsFromJson(studentProfile?.curriculumSelections);
  const curriculumMatch = studentSelections.find((selection) => curriculumMatches(tutorSelections, { board: selection.board, grade: selection.classLevel, subject: selection.subject }));
  const specialization = String(studentProfile?.specialization ?? "").toLowerCase();
  const city = String(studentProfile?.city ?? "").toLowerCase();
  const matchedSubject = splitCsv(tutor.subjects).find((subject) => specialization.includes(subject.toLowerCase()));
  const matchedBoard = splitCsv(tutor.boards).find((board) => specialization.includes(board.toLowerCase()));
  if (curriculumMatch) reasons.push(`${curriculumMatch.subject} for ${curriculumMatch.classLevel}`);
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
    curriculumSelections: curriculumSelectionsFromJson(profile.curriculumSelections),
    outreachEnabled: tutorProfile.outreachEnabled,
    outreachPlan: tutorProfile.outreachPlan,
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
  return [];
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
      return null;
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
  if (!program) return null;
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

async function buildLearnerProgressSummaries(profiles: any[], programIds: string[]) {
  const uniqueProfiles = Array.from(new Map(profiles.map((profile) => [profile.id, profile])).values());
  const uniqueProgramIds = Array.from(new Set(programIds)).filter(Boolean);
  if (!uniqueProfiles.length || !uniqueProgramIds.length) return [];

  const programs = await prisma.program.findMany({
    where: { id: { in: uniqueProgramIds } },
    orderBy: { title: "asc" },
    include: { milestones: { include: { activities: true } } }
  });
  const profileIds = uniqueProfiles.map((profile) => profile.id);
  const activityIds = programs.flatMap((program) => program.milestones.flatMap((milestone) => milestone.activities.map((activity) => activity.id)));
  const quizResourceIdsByProgram = new Map<string, Set<string>>();
  programs.forEach((program) => {
    quizResourceIdsByProgram.set(program.id, new Set(program.milestones.flatMap((milestone) => milestone.activities.filter((activity) => activity.type === "quiz").map((activity) => activity.resourceId))));
  });
  const quizResourceIds = Array.from(new Set(Array.from(quizResourceIdsByProgram.values()).flatMap((ids) => Array.from(ids))));

  const [activityProgress, programProgress, quizAttempts] = await Promise.all([
    activityIds.length ? prisma.activityProgress.findMany({
      where: { profileId: { in: profileIds }, activityId: { in: activityIds }, status: "complete" },
      select: { profileId: true, activityId: true, completedAt: true }
    }) : Promise.resolve([]),
    prisma.programProgress.findMany({
      where: { profileId: { in: profileIds }, programId: { in: uniqueProgramIds } }
    }),
    quizResourceIds.length ? prisma.quizAttempt.findMany({
      where: { profileId: { in: profileIds }, resourceId: { in: quizResourceIds } },
      orderBy: { createdAt: "desc" },
      select: { profileId: true, resourceId: true, percent: true, createdAt: true }
    }) : Promise.resolve([])
  ]);

  const completedByProfile = new Map<string, Set<string>>();
  const lastActivityByProfileProgram = new Map<string, Date>();
  const progressByProfileProgram = new Map(programProgress.map((item) => [`${item.profileId}:${item.programId}`, item]));
  const latestQuizByProfileProgram = new Map<string, number>();

  activityProgress.forEach((item) => {
    if (!completedByProfile.has(item.profileId)) completedByProfile.set(item.profileId, new Set());
    completedByProfile.get(item.profileId)?.add(item.activityId);
  });

  uniqueProfiles.forEach((profile) => {
    programs.forEach((program) => {
      const programActivityIds = program.milestones.flatMap((milestone) => milestone.activities.map((activity) => activity.id));
      const completedItems = activityProgress.filter((item) => item.profileId === profile.id && programActivityIds.includes(item.activityId));
      const lastCompletedAt = completedItems.map((item) => item.completedAt).filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0];
      if (lastCompletedAt) lastActivityByProfileProgram.set(`${profile.id}:${program.id}`, lastCompletedAt);
      const quizIds = quizResourceIdsByProgram.get(program.id) ?? new Set<string>();
      const latestQuiz = quizAttempts.find((attempt) => attempt.profileId === profile.id && quizIds.has(attempt.resourceId));
      if (latestQuiz) latestQuizByProfileProgram.set(`${profile.id}:${program.id}`, latestQuiz.percent);
    });
  });

  return uniqueProfiles.map((profile) => ({
    profileId: profile.id,
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    city: profile.city,
    programs: programs.map((program) => {
      const programActivityIds = program.milestones.flatMap((milestone) => milestone.activities.map((activity) => activity.id));
      const completedSet = completedByProfile.get(profile.id) ?? new Set<string>();
      const completedActivities = programActivityIds.filter((id) => completedSet.has(id)).length;
      const progress = progressByProfileProgram.get(`${profile.id}:${program.id}`);
      const lastActivityAt = lastActivityByProfileProgram.get(`${profile.id}:${program.id}`);
      return {
        programId: program.id,
        title: program.title,
        totalActivities: programActivityIds.length,
        completedActivities,
        percent: programActivityIds.length ? Math.round((completedActivities / programActivityIds.length) * 100) : 0,
        completedMilestoneSequence: progress?.completedMilestoneSequence ?? 0,
        unlockedMilestoneSequence: progress?.unlockedMilestoneSequence ?? 1,
        latestQuizPercent: latestQuizByProfileProgram.get(`${profile.id}:${program.id}`) ?? null,
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null
      };
    })
  }));
}

type DashboardMetrics = {
  classCount: number;
  studentCount: number;
  leadCount: number;
};

async function dashboardMetrics(role: Role, userId?: string | null): Promise<DashboardMetrics> {
  if (role === "tutor") {
    const profile = await findProfile("tutor", userId);
    const tutorProfile = profile ? await prisma.tutorProfile.findUnique({ where: { profileId: profile.id } }) : null;
    if (!tutorProfile) return { classCount: 0, studentCount: 0, leadCount: 0 };
    const [studentEnrollments, leadCount, classCount] = await Promise.all([
      prisma.batchEnrollment.findMany({
        where: { status: "active", batch: { tutorProfileId: tutorProfile.id } },
        distinct: ["studentProfileId"],
        select: { studentProfileId: true }
      }),
      prisma.batchRequest.count({ where: { status: "pending", batch: { tutorProfileId: tutorProfile.id } } }),
      prisma.tutorBatch.count({ where: { tutorProfileId: tutorProfile.id, status: { not: "archived" } } })
    ]);
    return { classCount, studentCount: studentEnrollments.length, leadCount };
  }
  if (role === "parent") {
    const childProfileIds = await getParentChildProfileIds(userId);
    const classCount = childProfileIds.length
      ? await prisma.batchEnrollment.count({ where: { studentProfileId: { in: childProfileIds }, status: "active" } })
      : 0;
    return { classCount, studentCount: childProfileIds.length, leadCount: 0 };
  }
  const profile = await findProfile("student", userId);
  const classCount = profile
    ? await prisma.batchEnrollment.count({ where: { studentProfileId: profile.id, status: "active" } })
    : 0;
  const leadCount = profile
    ? await prisma.batchRequest.count({ where: { studentProfileId: profile.id, status: "pending" } })
    : 0;
  return { classCount, studentCount: 0, leadCount };
}

function dashboardCards(role: Role, reminderCount: number, completedMilestones: number, recommendationCount: number, metrics: DashboardMetrics) {
  if (role === "tutor") {
    return [
      { value: String(metrics.studentCount), label: "Students", target: "roleHub" },
      { value: String(metrics.leadCount), label: "Leads", target: "roleHub" },
      { value: "4.8", label: "Rating", target: "ratings" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  if (role === "parent") {
    return [
      { value: String(metrics.classCount), label: "Classes", target: "roleHub" },
      { value: String(completedMilestones), label: "Completed", target: "sessions" },
      { value: String(recommendationCount), label: "Smart picks", target: "home" },
      { value: String(reminderCount), label: "Reminders", target: "events" }
    ];
  }
  return [
    { value: String(metrics.classCount), label: "Classes", target: "roleHub" },
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
      : `${capitalize(profile.role)} • ${profile.stream ?? "Senior"} • ${profileLabelFromCurriculum(curriculumSelectionsFromJson(profile.curriculumSelections)) ?? profile.specialization ?? "myTution"}`
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
    curriculumSelections: curriculumSelectionsFromJson(profile.curriculumSelections),
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
      profileStatus: profile.tutorProfile.profileStatus,
      outreachEnabled: profile.tutorProfile.outreachEnabled,
      outreachPlan: profile.tutorProfile.outreachPlan
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

function toConsentDocumentSummary(document: any): ConsentDocumentSummary {
  return {
    id: document.id,
    key: document.key,
    version: document.version,
    title: document.title,
    description: document.description,
    documentType: document.documentType === "url" ? "url" : "pdf",
    documentUrl: document.documentUrl,
    accessLevel: document.accessLevel === "private" ? "private" : "public",
    roleScope: document.roleScope ?? null,
    required: Boolean(document.required),
    status: document.status,
    permissionSet: document.permissionSet ?? {}
  };
}

async function activeConsentRequirements(role?: Role | null): Promise<ConsentDocumentSummary[]> {
  try {
    const documents = await prisma.consentDocument.findMany({
      where: {
        status: "active",
        required: true,
        OR: [{ roleScope: null }, ...(role ? [{ roleScope: role }] : [])]
      },
      orderBy: [{ roleScope: "asc" }, { createdAt: "asc" }]
    });
    if (documents.length) return documents.map(toConsentDocumentSummary);
    return [toConsentDocumentSummary(await ensureDefaultRegistrationConsent())];
  } catch (error) {
    if (!isMissingAccessControlTable(error)) throw error;
    return [defaultRegistrationConsent];
  }
}

async function ensureDefaultRegistrationConsent() {
  return prisma.consentDocument.upsert({
    where: { key_version: { key: defaultRegistrationConsent.key, version: defaultRegistrationConsent.version } },
    update: {
      title: defaultRegistrationConsent.title,
      description: defaultRegistrationConsent.description,
      documentType: defaultRegistrationConsent.documentType,
      documentUrl: defaultRegistrationConsent.documentUrl,
      accessLevel: defaultRegistrationConsent.accessLevel,
      required: defaultRegistrationConsent.required,
      status: defaultRegistrationConsent.status,
      permissionSet: (defaultRegistrationConsent.permissionSet ?? {}) as Prisma.InputJsonValue
    },
    create: {
      id: defaultRegistrationConsent.id,
      key: defaultRegistrationConsent.key,
      version: defaultRegistrationConsent.version,
      title: defaultRegistrationConsent.title,
      description: defaultRegistrationConsent.description,
      documentType: defaultRegistrationConsent.documentType,
      documentUrl: defaultRegistrationConsent.documentUrl,
      accessLevel: defaultRegistrationConsent.accessLevel,
      roleScope: defaultRegistrationConsent.roleScope,
      required: defaultRegistrationConsent.required,
      status: defaultRegistrationConsent.status,
      permissionSet: (defaultRegistrationConsent.permissionSet ?? {}) as Prisma.InputJsonValue,
      sourceTag: "app"
    }
  });
}

function toConsentAssignmentSummary(assignment: any): ConsentAssignmentSummary {
  return {
    id: assignment.id,
    consentDocumentId: assignment.consentDocumentId,
    consentKey: assignment.consentKey,
    consentVersion: assignment.consentVersion,
    assigner: {
      type: assignment.assignerType === "role" ? "role" : "user",
      role: assignment.assignerRole ?? null,
      userId: assignment.assignerUserId ?? null,
      profileId: assignment.assignerProfileId ?? null
    },
    assignee: {
      type: assignment.assigneeType === "role" ? "role" : "user",
      role: assignment.assigneeRole ?? null,
      userId: assignment.assigneeUserId ?? null,
      profileId: assignment.assigneeProfileId ?? null
    },
    status: assignment.status,
    permissionSet: assignment.permissionSet ?? {},
    metadata: assignment.metadata ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString()
  };
}

function normalizeConsentActor(input: unknown, fallback?: { role: Role; userId: string; profileId?: string | null }): ConsentAssignmentActor | null {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const type = value.type === "role" ? "role" : value.type === "user" ? "user" : fallback ? "user" : null;
  if (!type) return null;
  const role = value.role ? readRole(value.role) : fallback?.role ?? null;
  const userId = stringOrNull(value.userId) ?? (type === "user" ? fallback?.userId ?? null : null);
  const profileId = stringOrNull(value.profileId) ?? (type === "user" ? fallback?.profileId ?? null : null);
  if (type === "role" && !role) return null;
  if (type === "user" && !userId) return null;
  return {
    type,
    role,
    userId,
    profileId
  };
}

function normalizeConsentAssignmentInput(input: unknown, current: { role: Role; userId: string; profileId: string }) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const assigner = normalizeConsentActor(value.assigner, current);
  const assignee = normalizeConsentActor(value.assignee);
  const permissionSet = value.permissionSet && typeof value.permissionSet === "object" ? value.permissionSet as Record<string, unknown> : null;
  if (!assigner || !assignee || !permissionSet) return null;
  const assignerAllowed = assigner.type === "user"
    ? assigner.userId === current.userId
    : assigner.role === current.role;
  if (!assignerAllowed) return null;
  return {
    consentDocumentId: stringOrNull(value.consentDocumentId),
    consentKey: stringOrNull(value.consentKey),
    consentVersion: stringOrNull(value.consentVersion),
    assigner,
    assignee,
    status: stringOrNull(value.status) ?? "active",
    permissionSet,
    metadata: value.metadata && typeof value.metadata === "object" ? value.metadata as Record<string, unknown> : null
  };
}

async function resolveConsentDocumentForAssignment(consentDocumentId?: string | null, consentKey?: string | null, consentVersion?: string | null) {
  await ensureDefaultRegistrationConsent();
  if (consentDocumentId) {
    return prisma.consentDocument.findUnique({ where: { id: consentDocumentId } });
  }
  if (consentKey && consentVersion) {
    return prisma.consentDocument.findUnique({ where: { key_version: { key: consentKey, version: consentVersion } } });
  }
  return prisma.consentDocument.findUnique({ where: { id: defaultRegistrationConsent.id } });
}

async function listConsentAssignmentsForActor(actor: { role: Role; userId: string; profileId?: string | null }) {
  try {
    return await prisma.consentAssignment.findMany({
      where: {
        status: "active",
        OR: [
          { assigneeType: "role", assigneeRole: actor.role },
          { assigneeType: "user", assigneeUserId: actor.userId },
          ...(actor.profileId ? [{ assigneeType: "user", assigneeProfileId: actor.profileId }] : [])
        ]
      },
      orderBy: { createdAt: "asc" }
    });
  } catch (error) {
    if (!isMissingAccessControlTable(error)) throw error;
    return [];
  }
}

function mergePermissionSets(left: Record<string, unknown>, right: unknown): Record<string, unknown> {
  if (!right || typeof right !== "object" || Array.isArray(right)) return left;
  const merged: Record<string, unknown> = { ...left };
  Object.entries(right as Record<string, unknown>).forEach(([key, value]) => {
    const existing = merged[key];
    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = Array.from(new Set([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(value) ? value : [value])]));
      return;
    }
    if (existing && typeof existing === "object" && value && typeof value === "object") {
      merged[key] = mergePermissionSets(existing as Record<string, unknown>, value);
      return;
    }
    merged[key] = value;
  });
  return merged;
}

function fallbackPersona(role: Role) {
  return {
    role,
    firstName: "",
    lastName: "",
    initials: role.charAt(0).toUpperCase(),
    phone: "",
    profileLabel: `${capitalize(role)} • myTution`
  };
}

async function ensureSharedTutorFixture() {
  const phone = "+917838920129";
  const passwordHash = await hashPassword("Tutor@123");
  const curriculumSelections = [{ board: "CBSE", classLevel: "Class 10", subject: "Mathematics", stage: "Secondary" }];
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
      curriculumSelections: curriculumJson(curriculumSelections),
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
      curriculumSelections: curriculumJson(curriculumSelections),
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
      curriculumSelections: curriculumJson(curriculumSelectionsFromJson(profile.curriculumSelections).length ? curriculumSelectionsFromJson(profile.curriculumSelections) : curriculumSelections),
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
      curriculumSelections: curriculumJson(curriculumSelectionsFromJson(profile.curriculumSelections).length ? curriculumSelectionsFromJson(profile.curriculumSelections) : curriculumSelections),
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
      outreachEnabled: true,
      outreachPlan: "paid_outreach",
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
      outreachEnabled: true,
      outreachPlan: "paid_outreach",
      sourceTag: "mock"
    }
  });

  const freeProgram = await ensureSharedTutorProgram(profile.id, {
    title: "Class 10 board exam free foundation",
    description: "Free starter program with algebra notes, video, flashcards, and a diagnostic quiz.",
    feeType: "free",
    feeAmount: null
  });
  const paidProgram = await ensureSharedTutorProgram(profile.id, {
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
      capacity: 3,
      programId: freeProgram.id,
      feeType: "free",
      feeAmount: null
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
      programId: paidProgram.id,
      feeType: "paid",
      feeAmount: 2500
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
      programId: paidProgram.id,
      feeType: "paid",
      feeAmount: 2500
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
        programId: batch.programId,
        feeType: batch.feeType,
        feeAmount: batch.feeAmount,
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
        programId: batch.programId,
        feeType: batch.feeType,
        feeAmount: batch.feeAmount,
        sourceTag: "mock"
      }
    });
  }
  await ensureKnownStudentTutorMappings();
}

async function ensureParentStudentFixture() {
  await ensureSharedTutorFixture();
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
  await ensureKnownStudentTutorMappings();
}

async function ensureSharedTutorProgram(profileId: string, input: { title: string; description: string; feeType: "free" | "paid"; feeAmount: number | null }) {
  const existing = await prisma.program.findFirst({ where: { creatorProfileId: profileId, title: input.title } });
  if (existing) {
    const program = await prisma.program.update({
      where: { id: existing.id },
      data: { description: input.description, visibility: "published", status: "published", feeType: input.feeType, feeAmount: input.feeAmount, sourceTag: "mock" }
    });
    await ensureSharedTutorProgramAssets(program.id);
    return program;
  }
  const resources = await Promise.all([
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "video", title: input.title + " concept video", description: "Short lesson explaining the core concept before practice.", sourceUrl: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/video.mp4", storageType: "repo", thumbnailPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/thumbnail.png", bannerPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/banner.png", vttPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/captions.vtt", metadataPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/title-description.md", contentJson: { durationSeconds: 480, mediaUrl: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/video.mp4" }, sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "article", title: input.title + " notes", description: "Board-focused micro-notes with formulas, examples, and answer-writing tips.", body: "Revise identities, worked examples, and step-by-step board answer patterns.", storageType: "repo", thumbnailPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/thumbnail.png", bannerPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/banner.png", metadataPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/title-description.md", contentJson: { mediaUrl: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/article.pdf", pdfUrl: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/article.pdf" }, sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "flashcard", title: input.title + " recall cards", description: "Quick active recall cards for identities, terms, and common traps.", storageType: "repo", thumbnailPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/thumbnail.png", bannerPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/banner.png", metadataPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/title-description.md", sourceTag: "mock" } }),
    prisma.resource.create({ data: { creatorProfileId: profileId, type: "quiz", title: input.title + " diagnostic quiz", description: "Short MCQ check before moving to the next milestone.", storageType: "repo", thumbnailPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/thumbnail.png", bannerPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/banner.png", metadataPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/title-description.md", contentJson: { questions: [{ id: "class-10-board-q1", prompt: "Which expression is equal to a^2 - b^2?", options: ["(a + b)(a - b)", "(a - b)^2", "a^2 + b^2", "2ab"], answerIndex: 0, learnMore: "Difference of squares factors into sum and difference terms." }] }, sourceTag: "mock" } })
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

async function ensureSharedTutorProgramAssets(programId: string) {
  await Promise.all([
    prisma.resource.updateMany({
      where: { type: "video", milestoneActivities: { some: { milestone: { programId } } } },
      data: {
        sourceUrl: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/video.mp4",
        storageType: "repo",
        thumbnailPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/thumbnail.png",
        bannerPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/banner.png",
        vttPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/captions.vtt",
        metadataPath: "services/api/assets/mock/video/program/neet-foundation/kinematics-motion/v1/title-description.md",
        contentJson: { durationSeconds: 480, mediaUrl: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/video.mp4" }
      }
    }),
    prisma.resource.updateMany({
      where: { type: "article", milestoneActivities: { some: { milestone: { programId } } } },
      data: {
        storageType: "repo",
        thumbnailPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/thumbnail.png",
        bannerPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/banner.png",
        metadataPath: "services/api/assets/mock/article/program/neet-foundation/motion-micronotes/v1/title-description.md",
        contentJson: {
          mediaUrl: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/article.pdf",
          pdfUrl: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/article.pdf"
        }
      }
    }),
    prisma.resource.updateMany({
      where: { type: "flashcard", milestoneActivities: { some: { milestone: { programId } } } },
      data: {
        storageType: "repo",
        thumbnailPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/thumbnail.png",
        bannerPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/banner.png",
        metadataPath: "services/api/assets/mock/flashcard/program/neet-foundation/motion-active-recall/v1/title-description.md"
      }
    }),
    prisma.resource.updateMany({
      where: { type: "quiz", milestoneActivities: { some: { milestone: { programId } } } },
      data: {
        storageType: "repo",
        thumbnailPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/thumbnail.png",
        bannerPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/banner.png",
        metadataPath: "services/api/assets/mock/quiz/program/neet-foundation/motion-diagnostic/v1/title-description.md"
      }
    })
  ]);
}

async function ensureKnownStudentTutorMappings() {
  const studentUser = await prisma.user.findUnique({ where: { phone: "+917838920127" } });
  const tutorUser = await prisma.user.findUnique({ where: { phone: "+917838920129" } });
  if (!studentUser || !tutorUser) return;

  const [studentProfile, tutorProfileOwner] = await Promise.all([
    prisma.profile.findFirst({ where: { userId: studentUser.id, role: "student" } }),
    prisma.profile.findFirst({ where: { userId: tutorUser.id, role: "tutor" } })
  ]);
  if (!studentProfile || !tutorProfileOwner) return;

  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { profileId: tutorProfileOwner.id } });
  if (!tutorProfile) return;

  const programs = await prisma.program.findMany({
    where: {
      creatorProfileId: tutorProfileOwner.id,
      title: { in: ["Class 10 board exam free foundation", "Class 10 board exam 2 month crash course"] }
    },
    orderBy: [{ feeType: "asc" }, { title: "asc" }]
  });
  await prisma.batchEnrollment.deleteMany({
    where: {
      batch: { tutorProfileId: tutorProfile.id },
      studentProfile: {
        user: {
          OR: [
            { phone: { startsWith: "+91783893" } },
            { phone: { startsWith: "+91783894" } }
          ]
        }
      }
    }
  });

  for (const program of programs) {
    await prisma.studentProgramSelection.upsert({
      where: { profileId_programId: { profileId: studentProfile.id, programId: program.id } },
      update: { status: "active", sourceTag: "mock" },
      create: { profileId: studentProfile.id, programId: program.id, status: "active", sourceTag: "mock" }
    });
    await prisma.programProgress.upsert({
      where: { profileId_programId: { profileId: studentProfile.id, programId: program.id } },
      update: {},
      create: { profileId: studentProfile.id, programId: program.id, unlockedMilestoneSequence: 1, completedMilestoneSequence: 0, sourceTag: "mock" }
    });
    if (program.feeType === "paid" && (program.feeAmount ?? 0) > 0) {
      const existingOrder = await prisma.paymentOrder.findFirst({
        where: { profileId: studentProfile.id, targetType: "program_purchase", programId: program.id },
        orderBy: { createdAt: "desc" }
      });
      const order = existingOrder ? await prisma.paymentOrder.update({
        where: { id: existingOrder.id },
        data: { status: "paid", paidAt: existingOrder.paidAt ?? new Date(), methodType: existingOrder.methodType ?? "upi", paymentRail: existingOrder.paymentRail ?? "upi", tutorProfileId: tutorProfile.id, sourceTag: "mock" }
      }) : await prisma.paymentOrder.create({
        data: {
          userId: studentUser.id,
          profileId: studentProfile.id,
          role: "student",
          targetType: "program_purchase",
          targetId: program.id,
          programId: program.id,
          tutorProfileId: tutorProfile.id,
          amount: program.feeAmount ?? 0,
          status: "paid",
          gatewayProvider: "mock",
          gatewayOrderId: `mock_fixture_program_${program.id}_${studentProfile.id}`,
          gatewayPaymentId: `mock_fixture_paid_${program.id}_${studentProfile.id}`,
          methodType: "upi",
          paymentRail: "upi",
          paidAt: new Date(),
          metadata: { fixture: "known_student_tutor_mapping" },
          sourceTag: "mock"
        }
      });
      await prisma.programPurchase.upsert({
        where: { programId_studentProfileId: { programId: program.id, studentProfileId: studentProfile.id } },
        update: { orderId: order.id, status: "active", accessStatus: "active", purchasedAt: new Date(), sourceTag: "mock" },
        create: { orderId: order.id, programId: program.id, studentProfileId: studentProfile.id, status: "active", accessStatus: "active", purchasedAt: new Date(), sourceTag: "mock" }
      });
    }
  }

  const batches = await prisma.tutorBatch.findMany({
    where: { tutorProfileId: tutorProfile.id, programId: { in: programs.map((program) => program.id) } },
    orderBy: [{ feeType: "asc" }, { startsAt: "asc" }]
  });

  for (const batch of batches.slice(0, 2)) {
    let paymentOrderId: string | null = null;
    if (batch.feeType === "paid" && (batch.feeAmount ?? 0) > 0) {
      const existingOrder = await prisma.paymentOrder.findFirst({
        where: { profileId: studentProfile.id, targetType: "batch_admission", batchId: batch.id },
        orderBy: { createdAt: "desc" }
      });
      const order = existingOrder ? await prisma.paymentOrder.update({
        where: { id: existingOrder.id },
        data: { status: "paid", paidAt: existingOrder.paidAt ?? new Date(), methodType: existingOrder.methodType ?? "upi", paymentRail: existingOrder.paymentRail ?? "upi", tutorProfileId: tutorProfile.id, sourceTag: "mock" }
      }) : await prisma.paymentOrder.create({
        data: {
          userId: studentUser.id,
          profileId: studentProfile.id,
          role: "student",
          targetType: "batch_admission",
          targetId: batch.id,
          programId: batch.programId,
          batchId: batch.id,
          tutorProfileId: tutorProfile.id,
          amount: batch.feeAmount ?? 0,
          status: "paid",
          gatewayProvider: "mock",
          gatewayOrderId: `mock_fixture_batch_${batch.id}_${studentProfile.id}`,
          gatewayPaymentId: `mock_fixture_paid_${batch.id}_${studentProfile.id}`,
          methodType: "upi",
          paymentRail: "upi",
          paidAt: new Date(),
          metadata: { fixture: "known_student_tutor_mapping" },
          sourceTag: "mock"
        }
      });
      paymentOrderId = order.id;
    }
    const request = await prisma.batchRequest.upsert({
      where: { batchId_studentProfileId: { batchId: batch.id, studentProfileId: studentProfile.id } },
      update: { status: "approved", paymentOrderId, message: "Fixture enrollment for linked student account", sourceTag: "mock" },
      create: { batchId: batch.id, studentProfileId: studentProfile.id, status: "approved", paymentOrderId, message: "Fixture enrollment for linked student account", sourceTag: "mock" }
    });
    await prisma.batchEnrollment.upsert({
      where: { batchId_studentProfileId: { batchId: batch.id, studentProfileId: studentProfile.id } },
      update: { requestId: request.id, status: "active", sourceTag: "mock" },
      create: { batchId: batch.id, studentProfileId: studentProfile.id, requestId: request.id, status: "active", sourceTag: "mock" }
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
  sourceTag?: string | null;
}) {
  return {
    id: item.id,
    role: item.role,
    title: item.title,
    startsAt: item.startsAt.toISOString(),
    status: item.status,
    sourceTag: item.sourceTag ?? undefined
  };
}

function toNotificationSummary(item: any) {
  return {
    id: item.id,
    role: item.role,
    type: item.type,
    title: item.title,
    body: item.body,
    data: item.data ?? null,
    channel: item.channel,
    provider: item.provider,
    status: item.status,
    priority: item.priority,
    scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
    sentAt: item.sentAt ? item.sentAt.toISOString() : null,
    readAt: item.readAt ? item.readAt.toISOString() : null,
    createdAt: item.createdAt.toISOString()
  };
}

function toDeviceRegistrationSummary(item: any) {
  return {
    id: item.id,
    role: item.role,
    platform: item.platform,
    provider: item.provider,
    status: item.status,
    deviceId: item.deviceId ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function toQuizAttemptSummary(item: {
  id: string;
  resourceId: string;
  score: number;
  total: number;
  percent: number;
  answers: any;
  createdAt: Date;
}) {
  return {
    id: item.id,
    resourceId: item.resourceId,
    score: item.score,
    total: item.total,
    percent: item.percent,
    answers: Array.isArray(item.answers) ? item.answers.map((answer: unknown) => Number(answer)) : [],
    createdAt: item.createdAt.toISOString()
  };
}

function toActivityTimelineItem(item: any) {
  return {
    id: item.id,
    profileId: item.profileId,
    learnerName: `${item.profile.firstName} ${item.profile.lastName}`.trim(),
    programId: item.activity.milestone.programId,
    programTitle: item.activity.milestone.program.title,
    milestoneId: item.activity.milestoneId,
    milestoneTitle: item.activity.milestone.title,
    activityId: item.activityId,
    resourceId: item.activity.resourceId,
    type: item.activity.type,
    title: item.activity.title,
    status: item.status,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    updatedAt: item.updatedAt.toISOString()
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

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = String(req.headers["x-request-id"] ?? "");
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("api_error", {
    requestId,
    method: req.method,
    path: req.path,
    message,
    stack: isProduction || !(error instanceof Error) ? undefined : error.stack
  });
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error", requestId });
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandled_rejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("uncaught_exception", error);
});

app.listen(port, () => {
  console.log(`myTution API running on http://localhost:${port}`);
  void (async () => {
    await ensureParentStudentFixture();
  })().catch((error) => {
    if (isMissingParentLinkTable(error)) {
      console.warn("Parent/student fixture skipped until parent activation migration is applied");
      return;
    }
    console.warn("Shared tutor or parent/student fixture skipped", error);
  });
});
