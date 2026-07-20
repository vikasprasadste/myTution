import { appConfig, isFeatureEnabled } from "@mytution/config";
import type { BatchClass, BatchRequestSummary, CommunityComment, CommunityThread, CurriculumCatalogueResponse, CurriculumSelection, IdentityContext, IdentityProfile, LearnerProgressSummary, MarketplaceRecommendationResponse, NotificationSummary, ParentMonitoringResponse, PaymentMethodConfig, PaymentOrderSummary, Persona, ProgramMilestone, ProgramSummary, QuizAttemptSummary, Recommendation, Reminder, ResourceAssetMetadata, ResourceType, Role, TutorAccountingSummary, TutorBatchSummary, TutorProgramCreateInput, TutorProgramResourceInput, TutorSearchResult, TutorSupplyAnalytics } from "@mytution/shared";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEventListener } from "expo";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SvgXml, type SvgProps } from "react-native-svg";
import AccountActiveIcon from "../assets/nav/Account_active.svg";
import AccountInactiveIcon from "../assets/nav/Account_inactive.svg";
import ClassActiveIcon from "../assets/nav/class_active.svg";
import ClassInactiveIcon from "../assets/nav/class_inactive.svg";
import CommunityActiveIcon from "../assets/nav/Community_active.svg";
import CommunityInactiveIcon from "../assets/nav/Community_inactive.svg";
import HomeActiveIcon from "../assets/nav/Home_active.svg";
import HomeInactiveIcon from "../assets/nav/Home_inactive.svg";
import MilesActiveIcon from "../assets/nav/myMiles_active.svg";
import MilesInactiveIcon from "../assets/nav/myMiles_inactive.svg";
import { roleValueProps, personas, programMilestones, recommendations } from "@/data/mockData";
import { useRoleTheme } from "@/theme/useRoleTheme";

type AppScreen =
  | "role"
  | "value"
  | "phone"
  | "otp"
  | "createPassword"
  | "activation"
  | "forgotPassword"
  | "profile"
  | "editProfile"
  | "signin"
  | "home"
  | "search"
  | "sessions"
  | "milestoneDetail"
  | "payments"
  | "roleHub"
  | "chat"
  | "account"
  | "events"
  | "resource"
  | "flashIntro"
  | "flashPlay"
  | "quizIntro"
  | "quizPlay"
  | "quizResult"
  | "ratings";

const icon = require("../assets/AppIcons/appstore.png");

const valuePropImages: Record<Role, number[]> = {
  student: [
    require("../assets/value-props/find_verified_tutors.png"),
    require("../assets/value-props/book_trial_classes.png"),
    require("../assets/value-props/learn_with_smart_picks.png")
  ],
  tutor: [
    require("../assets/value-props/verified_lead.png"),
    require("../assets/value-props/run_your_teaching_day.png"),
    require("../assets/value-props/grow_with_trust.png")
  ],
  parent: [
    require("../assets/value-props/track_learning_clearly.png"),
    require("../assets/value-props/approve_with_confidence.png"),
    require("../assets/value-props/stay_on_top_of_class.png")
  ]
};

const roleCarouselCardBg: Record<Role, string> = {
  student: "#F2E1E5",
  parent: "#E4EFF0",
  tutor: "#EEF0E4"
};

type StreamKey = "junior" | "senior" | "ug" | "pg";
type AuthSession = { accessToken: string; refreshToken: string; tokenType: string };
type ParentLink = { id: string; name: string; relationship: string; status: string };
type DashboardCard = { value: string; label: string; target: AppScreen };
type SelectedActivity = Recommendation & { milestoneId?: string; activityId?: string; activitySequence?: number; milestoneSequence?: number; milestoneTitle?: string; required?: boolean };
type TutorProgramDraft = TutorProgramCreateInput;
type FlashcardPayload = { id?: string; sequence?: number; question: string; answer: string; learnMore?: string; relatedArticleId?: string | null };
type ResourceDetailPayload = SelectedActivity & {
  body?: string | null;
  contentJson?: Record<string, unknown> | null;
  flashcards?: FlashcardPayload[];
  assetSlug?: string | null;
  storageType?: string | null;
  thumbnailPath?: string | null;
  bannerPath?: string | null;
  vttPath?: string | null;
  metadataPath?: string | null;
  sourceUrl?: string | null;
  assetUrls?: {
    thumbnail?: string | null;
    banner?: string | null;
    vtt?: string | null;
    metadata?: string | null;
    media?: string | null;
  };
  assetMetadata?: ResourceAssetMetadata;
};
type VttCue = { start: number; end: number; text: string };
type JourneyActivity = SelectedActivity & { milestoneTitle: string; milestoneSequence: number; activitySequence: number; required: boolean; status: "pending" | "in_progress" | "complete" };
type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  learnMore: string;
  questionType?: "single" | "multi" | "free_text" | string;
  correctOptionIndexes?: number[];
  answerText?: string;
};
type QuizCheckpointPayload = { answers?: unknown; submitted?: unknown; currentIndex?: number; completed?: boolean; updatedAt?: string };
type QuizPayload = { resourceId: string; title: string; description: string; questions: QuizQuestion[]; checkpoint?: QuizCheckpointPayload | null };
type SignInMode = "fresh" | "returning";
type TutorFilterOptions = { subjects: string[]; locations: string[]; grades: string[]; boards: string[]; modes: string[]; languages: string[]; genders: string[]; experience: string[]; ratings: string[] };
type TutorSupplyState = { profile: IdentityProfile; programs: ProgramSummary[]; batches: TutorBatchSummary[]; analytics?: TutorSupplyAnalytics };
type MarketplaceTarget = { tutorProfileId: string; kind: "tutor" | "program" | "batch"; itemId?: string };
type TutorBatchDraft = {
  id?: string | null;
  programId: string;
  title: string;
  course: string;
  subject: string;
  grade: string;
  board: string;
  mode: string;
  schedule: string;
  classroomLocation: string;
  onlineLink: string;
  startsAt: string;
  capacity: string;
  status: string;
  feeType: string;
  feeAmount: string;
};
type ProfileDraft = {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  communicationAddress: string;
  alternatePhone: string;
  curriculumBoards: string[];
  curriculumClasses: string[];
  curriculumSubjects: string[];
  curriculumSelections: CurriculumSelection[];
};

const fallbackCurriculum: CurriculumCatalogueResponse = {
  boards: ["CBSE", "ICSE_ISC", "IB", "IGCSE_A_LEVEL", "State_Boards"].map((id) => ({
    id,
    label: id.replace(/_/g, " / "),
    fullName: null,
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, "_"),
      label,
      stage: label === "Class 11" || label === "Class 12" ? "Higher Secondary" : "School",
      subjects: ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Social Science", "Computer Science", "Accountancy", "Economics"]
    }))
  })),
  classes: [],
  subjects: ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Social Science", "Computer Science", "Accountancy", "Economics"]
};

function curriculumLabel(selections?: CurriculumSelection[]) {
  const first = selections?.[0];
  return first ? `${first.board} ${first.classLevel} ${first.subject}` : null;
}

function personaFromIdentity(profile: IdentityProfile | null | undefined, phone = ""): Persona | null {
  if (!profile) return null;
  return {
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    initials: profile.initials,
    phone,
    profileLabel: profile.role === "parent"
      ? `Parent • ${profile.linkedStudents[0]?.name ?? "Linked student"}`
      : `${capitalize(profile.role)} • ${profile.stream ?? "Senior"} • ${curriculumLabel(profile.curriculumSelections) ?? profile.specialization ?? "myTution"}`
  };
}

const streamOptions: Array<{ label: string; value: StreamKey }> = [
  { label: "Junior", value: "junior" },
  { label: "Senior", value: "senior" },
  { label: "UG", value: "ug" },
  { label: "PG", value: "pg" }
];

const specializationOptions: Record<StreamKey, string[]> = {
  junior: ["Class 1-5 Foundation", "Class 6-8 Mathematics", "Class 6-8 Science", "English Reading"],
  senior: ["CBSE Class 10 Mathematics", "ICSE Class 10 Science", "Class 11-12 Physics", "Class 11-12 Commerce"],
  ug: ["B.Com Accounting", "B.Tech Computer Science", "BA Economics", "B.Sc Mathematics"],
  pg: ["MBA Finance", "M.Sc Statistics", "MA English", "M.Tech Data Science"]
};

const fallbackFlashcards: FlashcardPayload[] = [
  { sequence: 1, question: "What is displacement?", answer: "Displacement is the change in position from start to finish, measured with direction." },
  { sequence: 2, question: "How is distance different from displacement?", answer: "Distance is total path length. Displacement depends only on initial and final position." },
  { sequence: 3, question: "What is average speed?", answer: "Average speed equals total distance divided by total time." },
  { sequence: 4, question: "What is average velocity?", answer: "Average velocity equals displacement divided by total time." }
];

const defaultAssetPathsByType: Record<string, { thumbnail: string; banner: string }> = {
  video: {
    thumbnail: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/thumbnail.svg",
    banner: "/api/v1/ams/files/mock/video/program/neet-foundation/kinematics-motion/v1/banner.svg"
  },
  article: {
    thumbnail: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/thumbnail.svg",
    banner: "/api/v1/ams/files/mock/article/program/neet-foundation/motion-micronotes/v1/banner.svg"
  },
  flashcard: {
    thumbnail: "/api/v1/ams/files/mock/flashcard/program/neet-foundation/motion-active-recall/v1/thumbnail.svg",
    banner: "/api/v1/ams/files/mock/flashcard/program/neet-foundation/motion-active-recall/v1/banner.svg"
  },
  quiz: {
    thumbnail: "/api/v1/ams/files/mock/quiz/program/neet-foundation/motion-diagnostic/v1/thumbnail.svg",
    banner: "/api/v1/ams/files/mock/quiz/program/neet-foundation/motion-diagnostic/v1/banner.svg"
  }
};

const defaultTutorProgramDraft: TutorProgramDraft = {
  title: "",
  description: "",
  visibility: "published",
  feeType: "free",
  feeAmount: null,
  milestones: []
};

const defaultTutorBatchDraft: TutorBatchDraft = {
  id: null,
  programId: "",
  title: "",
  course: "",
  subject: "Mathematics",
  grade: "Class 10",
  board: "CBSE",
  mode: "online",
  schedule: "",
  classroomLocation: "",
  onlineLink: "",
  startsAt: "2026-08-01T13:30:00.000Z",
  capacity: "20",
  status: "available",
  feeType: "free",
  feeAmount: ""
};

const emptyFlashcards = [
  { question: "", answer: "", learnMore: "" },
  { question: "", answer: "", learnMore: "" },
  { question: "", answer: "", learnMore: "" }
];

const emptyQuizQuestions = [{
  prompt: "",
  options: ["", "", "", ""],
  answerIndex: 0,
  learnMore: "",
  questionType: "single",
  correctOptionIndexes: [0],
  answerText: ""
}];

function isPublishedProgram(program?: ProgramSummary | null) {
  return program?.status === "published" || program?.visibility === "published";
}

function isArchivedProgram(program?: ProgramSummary | null) {
  return program?.status === "archived";
}

function programStatusMeta(program?: ProgramSummary | null) {
  if (isArchivedProgram(program)) {
    return { icon: "⎌", label: "Archived" };
  }
  const published = isPublishedProgram(program);
  return {
    icon: published ? "✓" : "◔",
    label: published ? "Published" : "In progress"
  };
}

function programOptionLabel(program: ProgramSummary) {
  const status = programStatusMeta(program);
  return `${status.icon} ${program.title} • ${status.label}`;
}

function compactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  return `${first}${second}`.toUpperCase() || "ST";
}

export default function Index() {
  const [role, setRole] = useState<Role>("student");
  const [screen, setScreen] = useState<AppScreen>("role");
  const [showAppSplash, setShowAppSplash] = useState(true);
  const [signInMode, setSignInMode] = useState<SignInMode>("fresh");
  const [valueIndex, setValueIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSeconds, setOtpSeconds] = useState(60);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [parentActivationCode, setParentActivationCode] = useState("");
  const [activationRelationship, setActivationRelationship] = useState("Mother");
  const [activationCode, setActivationCode] = useState("");
  const [activationCodesByRelationship, setActivationCodesByRelationship] = useState<Record<string, { code: string; expiresAt: number }>>({});
  const [activationSeconds, setActivationSeconds] = useState(0);
  const [linkedParents, setLinkedParents] = useState<ParentLink[]>([]);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSeconds, setResetSeconds] = useState(0);
  const [resetRequested, setResetRequested] = useState(false);
  const [stream, setStream] = useState<StreamKey>("senior");
  const [specialization, setSpecialization] = useState("CBSE Class 10 Mathematics");
  const [curriculumCatalogue, setCurriculumCatalogue] = useState<CurriculumCatalogueResponse>(fallbackCurriculum);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    firstName: "",
    lastName: "",
    dob: "",
    city: "",
    communicationAddress: "",
    alternatePhone: "",
    curriculumBoards: [],
    curriculumClasses: [],
    curriculumSubjects: [],
    curriculumSelections: []
  });
  const [apiNotice, setApiNotice] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [identityContext, setIdentityContext] = useState<IdentityContext | null>(null);
  const [apiPersona, setApiPersona] = useState<Persona | null>(null);
  const [apiRecommendations, setApiRecommendations] = useState<Recommendation[] | null>(null);
  const [marketplaceRecommendations, setMarketplaceRecommendations] = useState<MarketplaceRecommendationResponse | null>(null);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[] | null>(null);
  const [apiMilestones, setApiMilestones] = useState<ProgramMilestone[] | null>(null);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<ProgramSummary[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [draftProgramId, setDraftProgramId] = useState<string | null>(null);
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [programModalCanClose, setProgramModalCanClose] = useState(false);
  const [programModalSeen, setProgramModalSeen] = useState(false);
  const [programPreparing, setProgramPreparing] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);
  const [programRefreshKey, setProgramRefreshKey] = useState(0);
  const [programToast, setProgramToast] = useState("");
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [programArchiveModalVisible, setProgramArchiveModalVisible] = useState(false);
  const [tutorProgramDraft, setTutorProgramDraft] = useState<TutorProgramDraft>(defaultTutorProgramDraft);
  const [tutorProgramComposerOpen, setTutorProgramComposerOpen] = useState(false);
  const [editingTutorProgramId, setEditingTutorProgramId] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [reminderTitle, setReminderTitle] = useState("Math revision reminder");
  const [reminderDate, setReminderDate] = useState("24/06/2026");
  const [reminderTime, setReminderTime] = useState("06:30 PM");
  const [connectedPeople, setConnectedPeople] = useState("");
  const [connectedPeopleByReminder, setConnectedPeopleByReminder] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<null | { target: "dob" | "reminderDate" | "reminderTime"; mode: "date" | "time"; value: Date }>(null);
  const [recommendationsReady, setRecommendationsReady] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<ProgramMilestone | null>(null);
  const [selectedResource, setSelectedResource] = useState<SelectedActivity | null>(null);
  const [resourceDetail, setResourceDetail] = useState<ResourceDetailPayload | null>(null);
  const [tutorResults, setTutorResults] = useState<TutorSearchResult[]>([]);
  const [marketplaceTarget, setMarketplaceTarget] = useState<MarketplaceTarget | null>(null);
  const [tutorFilterOptions, setTutorFilterOptions] = useState<TutorFilterOptions>({ subjects: [], locations: [], grades: [], boards: [], modes: [], languages: [], genders: [], experience: [], ratings: [] });
  const [batchClasses, setBatchClasses] = useState<BatchClass[]>([]);
  const [batchRequests, setBatchRequests] = useState<BatchRequestSummary[]>([]);
  const [learnerProgress, setLearnerProgress] = useState<LearnerProgressSummary[]>([]);
  const [parentMonitoring, setParentMonitoring] = useState<ParentMonitoringResponse | null>(null);
  const [tutorSupply, setTutorSupply] = useState<TutorSupplyState | null>(null);

  useEffect(() => {
    let ignore = false;
    apiGet<{ data: CurriculumCatalogueResponse }>("/api/v1/usermanagement/curriculum")
      .then((response) => {
        if (!ignore && response.data?.boards?.length) setCurriculumCatalogue(response.data);
      })
      .catch(() => {
        if (!ignore) setCurriculumCatalogue(fallbackCurriculum);
      });
    return () => { ignore = true; };
  }, []);
  const [tutorBatchDraft, setTutorBatchDraft] = useState<TutorBatchDraft>(defaultTutorBatchDraft);
  const [tutorSearchLoading, setTutorSearchLoading] = useState(false);
  const [classHubLoading, setClassHubLoading] = useState(false);
  const [completedTopic, setCompletedTopic] = useState<null | { milestoneId: string; nextActivity?: SelectedActivity; nextMilestoneActivity?: SelectedActivity; milestoneComplete: boolean; programComplete?: boolean }>(null);
  const [completedRecommendations, setCompletedRecommendations] = useState<string[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashAnswer, setFlashAnswer] = useState(false);
  const [quizPayload, setQuizPayload] = useState<QuizPayload | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[][]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean[]>([]);
  const [completedMilestone, setCompletedMilestone] = useState(0);
  const programTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useRoleTheme(role);
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const phoneForApi = `+91${phoneDigits.slice(-10)}`;
  const phoneComplete = phoneDigits.length === 10;
  const otpComplete = otp.every((digit) => /^\d$/.test(digit));
  const otpValue = otp.join("");
  const passwordValid = password.length >= 8 && password === confirmPassword;
  const resetPasswordValid = resetPassword.length >= 8 && resetPassword === resetConfirmPassword;
  const emptyPersona = useMemo<Persona>(() => ({
    role,
    firstName: "",
    lastName: "",
    initials: role.charAt(0).toUpperCase(),
    phone: phoneForApi,
    profileLabel: `${capitalize(role)} • myTution`
  }), [phoneForApi, role]);
  const identityPersona = personaFromIdentity(identityContext?.activeProfile, identityContext?.user.phone);
  const persona = (authSession || screen === "signin") && identityPersona?.role === role ? identityPersona : (authSession || screen === "signin") && apiPersona?.role === role ? apiPersona : emptyPersona;

  const roleRecommendations = useMemo(
    () => (apiRecommendations ?? recommendations.filter((item) => item.role === role)).filter((item) => !completedRecommendations.includes(item.id)),
    [apiRecommendations, completedRecommendations, role]
  );

  const roleReminders = reminders.filter((item) => item.role === role && item.status === "active");
  const homeMilestones = apiMilestones ?? programMilestones;
  const journeyActivities = useMemo(() => buildJourneyActivities(role, homeMilestones), [homeMilestones, role]);
  const carouselLimit = Number.isFinite(appConfig.home?.maxActivitiesPerCarousel) ? appConfig.home.maxActivitiesPerCarousel : 5;
  const reminderPreviewLimit = Number.isFinite(appConfig.home?.maxRemindersPreview) ? appConfig.home.maxRemindersPreview : 2;
  const forYouTodayActivities = journeyActivities.filter((activity) => activity.required && activity.status !== "complete").slice(0, carouselLimit);
  const programComplete = homeMilestones.length > 0 && homeMilestones.every((milestone) => (milestone.activities ?? []).length > 0 && (milestone.activities ?? []).every((activity) => activity.status === "complete"));

  useEffect(() => {
    if (screen !== "otp") return undefined;
    setOtpSeconds(60);
    const timer = setInterval(() => setOtpSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (!resetRequested || resetSeconds <= 0) return undefined;
    const timer = setInterval(() => setResetSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resetRequested, resetSeconds]);

  useEffect(() => {
    if (resetRequested && resetSeconds === 0) setResetCode("");
  }, [resetRequested, resetSeconds]);

  useEffect(() => {
    const active = activationCodesByRelationship[activationRelationship];
    if (!active) {
      setActivationCode("");
      setActivationSeconds(0);
      return undefined;
    }
    const sync = () => {
      const seconds = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 1000));
      setActivationSeconds(seconds);
      setActivationCode(seconds > 0 ? active.code : "");
      if (seconds <= 0) {
        setActivationCodesByRelationship((items) => {
          const next = { ...items };
          delete next[activationRelationship];
          return next;
        });
      }
    };
    sync();
    const timer = setInterval(sync, 1000);
    return () => clearInterval(timer);
  }, [activationCodesByRelationship, activationRelationship]);

  useEffect(() => {
    if (screen !== "home") return undefined;
    setRecommendationsReady(false);
    const timer = setTimeout(() => setRecommendationsReady(true), 1600);
    return () => clearTimeout(timer);
  }, [screen, role]);

  useEffect(() => {
    if (screen === "account") void loadParentActivation();
  }, [screen, authSession?.accessToken, role]);

  useEffect(() => {
    if (screen !== "sessions") return;
    if (role === "tutor") {
      setProgramModalVisible(false);
      setProgramModalCanClose(false);
      return;
    }
    if (programModalSeen || !programs.length) return;
    if (role === "parent") {
      setDraftProgramId(selectedProgramId ?? selectedPrograms[0]?.id ?? programs[0]?.id ?? null);
      setProgramModalSeen(true);
      setProgramModalVisible(false);
      return;
    }
    if (role !== "student" || selectedPrograms.length > 0) return;
    setDraftProgramId(selectedProgramId ?? programs[0]?.id ?? null);
    setProgramMenuOpen(false);
    setProgramModalCanClose(false);
    setProgramModalVisible(true);
  }, [programModalSeen, programs, role, screen, selectedProgramId, selectedPrograms.length]);

  useEffect(() => {
    if (!programToast) return undefined;
    const timer = setTimeout(() => setProgramToast(""), 3000);
    return () => clearTimeout(timer);
  }, [programToast]);

  useEffect(() => () => {
    if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowAppSplash(false), 2600);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (screen === "search" && role === "student") refreshTutorSearch({ subject: "Mathematics" });
    if (screen === "home" && role === "student") refreshStudentBatchRequests();
    if (screen === "roleHub") {
      if (role === "student") {
        refreshClasses("student");
        refreshStudentBatchRequests();
      }
      if (role === "tutor") {
        refreshClasses("tutor");
        refreshBatchRequests();
        refreshTutorSupply();
        refreshLearnerProgress("tutor");
      }
      if (role === "parent") refreshClasses("parent");
    }
    if (screen === "account" && role === "tutor") refreshBatchRequests();
  }, [screen, role, authSession?.accessToken]);

  async function prepareProgram(nextProgramId?: string | null) {
    const resolvedProgramId = nextProgramId ?? draftProgramId ?? selectedProgramId ?? programs[0]?.id ?? null;
    if (!resolvedProgramId) return;
    if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
    setProgramPreparing(true);
    setPendingProgramId(resolvedProgramId);
    setProgramMenuOpen(false);
    programTimeoutRef.current = setTimeout(() => {
      setProgramPreparing(false);
      setPendingProgramId(null);
      setProgramToast("Program setup timed out. Please try again.");
    }, 15000);
    try {
      if (role === "student") {
        const response = await apiPost<{ programs: ProgramSummary[]; selectedPrograms: ProgramSummary[]; maxSelectedPrograms: number }>("/api/v1/education-plan/programs/select", {
          role,
          programId: resolvedProgramId
        }, authSession?.accessToken);
        setPrograms(response.programs);
        setSelectedPrograms(response.selectedPrograms);
      }
      setSelectedProgramId(resolvedProgramId);
      setProgramRefreshKey((value) => value + 1);
    } catch {
      if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
      setProgramPreparing(false);
      setPendingProgramId(null);
      setApiNotice("Program could not be added. Students can select up to 3 programs.");
    }
  }

  function openProgramPicker() {
    if (role === "tutor") {
      setProgramMenuOpen(false);
      setTutorProgramDraft(defaultTutorProgramDraft);
      setEditingTutorProgramId(null);
      setTutorProgramComposerOpen(true);
      return;
    }
    if (role === "student" && selectedPrograms.length >= 3) {
      setProgramMenuOpen(false);
      setProgramToast("You can keep up to 3 active programs.");
      return;
    }
    const selectedIds = new Set(selectedPrograms.map((program) => program.id));
    const nextProgram = role === "student" ? programs.find((program) => !selectedIds.has(program.id)) : programs.find((program) => program.id === selectedProgramId) ?? programs[0];
    setDraftProgramId(nextProgram?.id ?? selectedProgramId ?? programs[0]?.id ?? null);
    setProgramMenuOpen(false);
    setProgramModalCanClose(true);
    setProgramModalVisible(true);
  }

  async function loadTutorProgramForEdit(programId: string) {
    setSelectedProgramId(programId);
    const program = programs.find((item) => item.id === programId);
    if (isPublishedProgram(program)) {
      setTutorProgramComposerOpen(false);
      setEditingTutorProgramId(null);
      setProgramRefreshKey((value) => value + 1);
      setProgramToast("Published programs are view-only.");
      return;
    }
    setLoadingAction("loadTutorProgram:" + programId);
    try {
      const response = await apiGet<{ data: TutorProgramDraft & { id: string } }>(`/api/v1/education-plan/tutor/programs/${programId}`, authSession?.accessToken);
      setTutorProgramDraft(response.data);
      setEditingTutorProgramId(programId);
      setTutorProgramComposerOpen(true);
      setApiNotice("");
    } catch {
      setApiNotice("Program details could not be loaded. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  function editTutorActivityFromMilestone(activityId: string) {
    const program = programs.find((item) => item.id === selectedProgramId);
    if (!program || isPublishedProgram(program)) {
      setProgramToast("Published programs are view-only.");
      return;
    }
    void loadTutorProgramForEdit(program.id);
    setProgramToast("Activity editor opened. Update the activity and save the program.");
    setScreen("sessions");
  }

  async function createTutorProgram() {
    const editingId = editingTutorProgramId;
    setLoadingAction("createTutorProgram");
    try {
      const response = editingId
        ? await apiPut<{ data: ProgramSummary }>(`/api/v1/education-plan/tutor/programs/${editingId}`, tutorProgramDraft, authSession?.accessToken)
        : await apiPost<{ data: ProgramSummary }>("/api/v1/education-plan/tutor/programs", tutorProgramDraft, authSession?.accessToken);
      setPrograms((items) => [response.data, ...items.filter((item) => item.id !== response.data.id)]);
      setSelectedProgramId(response.data.id);
      setTutorProgramComposerOpen(false);
      setEditingTutorProgramId(null);
      setTutorProgramDraft(defaultTutorProgramDraft);
      setProgramRefreshKey((value) => value + 1);
      setProgramToast(editingId ? "Program updates saved." : "Program created and ready to configure.");
      setApiNotice("");
    } catch {
      setApiNotice(editingId ? "Program could not be updated. Please check API deployment and login state." : "Program could not be created. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function publishTutorProgram(programId: string) {
    setLoadingAction("publishTutorProgram:" + programId);
    try {
      const response = await apiPost<{ data: ProgramSummary }>(`/api/v1/education-plan/tutor/programs/${programId}/publish`, {}, authSession?.accessToken);
      setPrograms((items) => [response.data, ...items.filter((item) => item.id !== response.data.id)]);
      setSelectedProgramId(response.data.id);
      setTutorProgramComposerOpen(false);
      setEditingTutorProgramId(null);
      setProgramRefreshKey((value) => value + 1);
      await refreshTutorSupply();
      setProgramToast("Program published. Students can now discover it.");
      setApiNotice("");
    } catch {
      setApiNotice("Program could not be published. Make sure every milestone has at least one activity.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function archiveTutorProgram(programId?: string | null) {
    if (!programId) return;
    setProgramMenuOpen(false);
    setProgramArchiveModalVisible(false);
    setLoadingAction("archiveTutorProgram:" + programId);
    try {
      await apiPost(`/api/v1/education-plan/tutor/programs/${programId}/archive`, {}, authSession?.accessToken);
      setPrograms((items) => items.map((item) => item.id === programId ? { ...item, status: "archived", visibility: "private" } : item));
      if (selectedProgramId === programId) setSelectedProgramId(null);
      setProgramRefreshKey((value) => value + 1);
      await refreshTutorSupply();
      setProgramToast("Program archived.");
      setApiNotice("");
    } catch {
      setApiNotice("Program could not be archived. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function restoreTutorProgram(programId?: string | null) {
    if (!programId) return;
    setProgramMenuOpen(false);
    setProgramArchiveModalVisible(false);
    setLoadingAction("restoreTutorProgram:" + programId);
    try {
      const response = await apiPost<{ data: ProgramSummary }>(`/api/v1/education-plan/tutor/programs/${programId}/restore`, {}, authSession?.accessToken);
      setPrograms((items) => [response.data, ...items]);
      setSelectedProgramId(response.data.id);
      setProgramRefreshKey((value) => value + 1);
      await refreshTutorSupply();
      setProgramToast("Archived program copied as a new in-progress program.");
      setApiNotice("");
    } catch {
      setApiNotice("Program could not be restored. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function loadRoleData() {
      try {
        const token = authSession?.accessToken;
        const [identity, bootstrap, recs, marketplace, eventData, notificationData, dashboard, programList, monitoring] = await Promise.all([
          token ? apiGet<{ data: IdentityContext }>(`/api/v1/identity/me?role=${role}`, token) : Promise.resolve({ data: null as IdentityContext | null }),
          apiGet<{ persona: Persona }>(`/api/v1/bootstrap?role=${role}`, token),
          apiGet<{ data: Recommendation[] }>(`/api/v1/recommendations?role=${role}`),
          role === "student" ? apiGet<{ data: MarketplaceRecommendationResponse }>(`/api/v1/marketplace/recommendations?role=student`, token) : Promise.resolve({ data: null as MarketplaceRecommendationResponse | null }),
          token ? apiGet<{ data: Reminder[] }>(`/api/v1/events-reminders?role=${role}`, token) : Promise.resolve({ data: [] }),
          token ? apiGet<{ data: NotificationSummary[] }>(`/api/v1/notifications?role=${role}&limit=12`, token) : Promise.resolve({ data: [] }),
          token ? apiGet<{ data: { cards: DashboardCard[] } }>(`/api/v1/dis/dashboard?role=${role}`, token) : Promise.resolve({ data: { cards: [] } }),
          apiGet<{ data: ProgramSummary[]; selectedPrograms?: ProgramSummary[]; maxSelectedPrograms?: number }>(`/api/v1/education-plan/programs?role=${role}`, token),
          token && role === "parent" ? apiGet<{ data: ParentMonitoringResponse }>(`/api/v1/parent/monitoring?role=parent`, token) : Promise.resolve({ data: null as ParentMonitoringResponse | null })
        ]);
        const selectedFromApi = programList.selectedPrograms ?? programList.data.filter((program) => program.selected);
        const existingProgramId = selectedProgramId && programList.data.some((program) => program.id === selectedProgramId) ? selectedProgramId : null;
        const defaultProgram = role === "tutor" ? programList.data.find((program) => !isArchivedProgram(program)) : programList.data[0];
        const programId = existingProgramId && (role !== "tutor" || !isArchivedProgram(programList.data.find((program) => program.id === existingProgramId))) ? existingProgramId : selectedFromApi[0]?.id ?? (role === "student" ? null : defaultProgram?.id ?? null);
        const plan = programId
          ? await apiGet<{ data: { milestones: ProgramMilestone[]; completedMilestoneSequence: number } }>(`/api/v1/education-plan/current?role=${role}&programId=${programId}`, token)
          : { data: { milestones: [], completedMilestoneSequence: 0 } };
        if (ignore) return;
        setIdentityContext(identity.data);
        setApiPersona(token ? personaFromIdentity(identity.data?.activeProfile, identity.data?.user.phone) ?? bootstrap.persona : null);
        setApiRecommendations(recs.data);
        setMarketplaceRecommendations(marketplace.data);
        if (marketplace.data?.tutors?.length) {
          setTutorResults((items) => items.length ? items : marketplace.data?.tutors ?? []);
          setTutorFilterOptions((items) => items.subjects.length ? items : buildTutorFilterOptions(marketplace.data?.tutors ?? []));
        }
        setReminders(eventData.data);
        setNotifications(notificationData.data);
        setDashboardCards(dashboard.data.cards);
        setParentMonitoring(monitoring.data);
        setPrograms(programList.data);
        setSelectedPrograms(selectedFromApi);
        setSelectedProgramId(programId);
        setApiMilestones(plan.data.milestones);
        setCompletedMilestone(plan.data.completedMilestoneSequence);
        if (token && role === "student" && selectedFromApi.length === 0 && screen === "home") {
          setProgramModalSeen(false);
          setScreen("sessions");
        }
        if (pendingProgramId && programId === pendingProgramId) {
          if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
          setProgramPreparing(false);
          setPendingProgramId(null);
          setProgramModalVisible(false);
          setProgramModalSeen(true);
          setProgramToast("Your program is ready.");
        }
        setApiNotice("");
      } catch {
        if (ignore) return;
        setApiNotice("Using local fallback data because API is unavailable.");
        setIdentityContext(null);
        setApiRecommendations(null);
        setDashboardCards(null);
        setNotifications([]);
        setParentMonitoring(null);
        setApiMilestones(null);
        if (pendingProgramId) {
          if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
          setProgramPreparing(false);
          setPendingProgramId(null);
          setProgramToast("Program setup failed. Please try again.");
        }
      }
    }
    loadRoleData();
    return () => {
      ignore = true;
    };
  }, [role, authSession?.accessToken, selectedProgramId, programRefreshKey, pendingProgramId, screen]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setAvatarUri(result.assets[0]?.uri ?? null);
  }

  async function refreshTutorSearch(filters: { subject?: string; location?: string; grade?: string; board?: string; mode?: string; language?: string; gender?: string; experience?: string; rating?: string } = {}) {
    setTutorSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.set("subject", filters.subject);
      if (filters.grade) params.set("grade", filters.grade);
      if (filters.board) params.set("board", filters.board);
      if (filters.mode) params.set("mode", filters.mode);
      if (filters.location) params.set("location", filters.location);
      if (filters.language) params.set("language", filters.language);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.experience) params.set("minExperience", filters.experience.replace(/\D/g, ""));
      if (filters.rating) params.set("minRating", filters.rating.replace(/[^\d.]/g, ""));
      const query = params.toString();
      const response = await apiGet<{ data: TutorSearchResult[] }>(`/api/v1/usermanagement/tutors${query ? "?" + query : ""}`, authSession?.accessToken);
      const tutors = response.data;
      setTutorFilterOptions(buildTutorFilterOptions(tutors));
      setTutorResults(tutors);
      setApiNotice("");
    } catch {
      setTutorResults([]);
      setApiNotice("Tutor search could not be loaded from API. Please redeploy or check the API service.");
    } finally {
      setTutorSearchLoading(false);
    }
  }

  async function requestBatch(batchId: string) {
    setLoadingAction("requestBatch:" + batchId);
    try {
      const response = await apiPost<{ data?: { paymentRequired?: boolean; order?: PaymentOrderSummary } }>("/api/v1/usermanagement/batch-requests", { batchId, message: "I would like to join this batch.", methodType: "upi" }, authSession?.accessToken);
      if (response?.data?.paymentRequired && response.data.order) {
        await apiPost(`/api/v1/payments/orders/${response.data.order.id}/confirm`, { methodType: "upi" }, authSession?.accessToken);
        setApiNotice("Payment completed. Batch request sent to tutor.");
      } else {
        setApiNotice("Batch request sent to tutor.");
      }
      await refreshTutorSearch();
      await refreshStudentBatchRequests();
    } catch {
      setApiNotice("Batch request failed. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function addTutorProgramToStudent(programId: string) {
    setLoadingAction("addTutorProgram:" + programId);
    try {
      const response = await apiPost<{ programs: ProgramSummary[]; selectedPrograms: ProgramSummary[]; maxSelectedPrograms: number }>("/api/v1/education-plan/programs/select", {
        role: "student",
        programId
      }, authSession?.accessToken);
      setPrograms(response.programs);
      setSelectedPrograms(response.selectedPrograms);
      setSelectedProgramId(programId);
      setProgramRefreshKey((value) => value + 1);
      setProgramToast("Program added to Program.");
      setScreen("sessions");
      setApiNotice("");
    } catch {
      setApiNotice("Program could not be added. Please check login/API.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function requestProgramPurchase(programId: string) {
    setLoadingAction("purchaseProgram:" + programId);
    try {
      const response = await apiPost<{ data: { order?: PaymentOrderSummary | null; status: string } }>("/api/v1/marketplace/program-interest", { programId, methodType: "upi" }, authSession?.accessToken);
      if (response.data.order) {
        await apiPost(`/api/v1/payments/orders/${response.data.order.id}/confirm`, { methodType: "upi" }, authSession?.accessToken);
        setSelectedProgramId(programId);
        setProgramRefreshKey((value) => value + 1);
        setApiNotice("Payment completed. Program added to Program.");
        setScreen("sessions");
      } else {
        setApiNotice("Purchase interest recorded.");
      }
    } catch {
      setApiNotice("Purchase interest could not be recorded. Please check login/API.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function refreshClasses(targetRole: Role = role) {
    setClassHubLoading(true);
    try {
      const response = await apiGet<{ data: BatchClass[] }>(`/api/v1/usermanagement/classes?role=${targetRole}`, authSession?.accessToken);
      setBatchClasses(response.data);
      setApiNotice("");
    } catch {
      setBatchClasses([]);
      setApiNotice("Classes could not be loaded from API.");
    } finally {
      setClassHubLoading(false);
    }
  }

  async function refreshDashboardCards(targetRole: Role = role) {
    if (!authSession?.accessToken) return;
    try {
      const response = await apiGet<{ data: { cards: DashboardCard[] } }>(`/api/v1/dis/dashboard?role=${targetRole}`, authSession.accessToken);
      if (targetRole === role) setDashboardCards(response.data.cards);
    } catch {
      // Dashboard cards are secondary to the action that triggered them.
    }
  }

  async function refreshLearnerProgress(targetRole: Role = role) {
    if (!authSession?.accessToken) return;
    try {
      const response = await apiGet<{ data: LearnerProgressSummary[] }>(`/api/v1/education-plan/progress-summary?role=${targetRole}${selectedProgramId ? "&programId=" + encodeURIComponent(selectedProgramId) : ""}`, authSession.accessToken);
      if (targetRole === role) setLearnerProgress(response.data);
    } catch {
      if (targetRole === role) setLearnerProgress([]);
    }
  }

  async function refreshBatchRequests() {
    setClassHubLoading(true);
    try {
      const response = await apiGet<{ data: BatchRequestSummary[] }>("/api/v1/usermanagement/batch-requests?role=tutor", authSession?.accessToken);
      setBatchRequests(response.data);
      setApiNotice("");
    } catch {
      setBatchRequests([]);
      setApiNotice("Tutor requests could not be loaded from API.");
    } finally {
      setClassHubLoading(false);
    }
  }

  async function refreshTutorSupply() {
    try {
      const response = await apiGet<{ data: TutorSupplyState }>("/api/v1/tutor/supply", authSession?.accessToken);
      setTutorSupply(response.data);
      setPrograms(response.data.programs);
      if (!tutorBatchDraft.programId && response.data.programs[0]?.id) {
        setTutorBatchDraft((draft) => ({ ...draft, programId: response.data.programs[0].id, course: draft.course || response.data.programs[0].title }));
      }
      setApiNotice("");
    } catch {
      setTutorSupply(null);
      setApiNotice("Tutor supply could not be loaded from API.");
    }
  }

  async function saveTutorBatch() {
    const programId = tutorBatchDraft.programId || tutorSupply?.programs[0]?.id || "";
    const payload = {
      programId: programId || undefined,
      title: tutorBatchDraft.title,
      course: tutorBatchDraft.course || tutorSupply?.programs.find((program) => program.id === programId)?.title || "",
      subject: tutorBatchDraft.subject,
      grade: tutorBatchDraft.grade,
      board: tutorBatchDraft.board,
      mode: tutorBatchDraft.mode,
      schedule: tutorBatchDraft.schedule,
      classroomLocation: tutorBatchDraft.classroomLocation || null,
      onlineLink: tutorBatchDraft.onlineLink || null,
      startsAt: tutorBatchDraft.startsAt,
      capacity: Number(tutorBatchDraft.capacity) || 1,
      status: tutorBatchDraft.status,
      feeType: tutorBatchDraft.feeType,
      feeAmount: tutorBatchDraft.feeType === "paid" ? Number(tutorBatchDraft.feeAmount) || 0 : null
    };
    setLoadingAction("saveTutorBatch");
    try {
      if (tutorBatchDraft.id) {
        await apiPut<{ data: TutorBatchSummary }>(`/api/v1/tutor/batches/${tutorBatchDraft.id}`, payload, authSession?.accessToken);
        setApiNotice("Batch updated.");
      } else {
        await apiPost<{ data: TutorBatchSummary }>("/api/v1/tutor/batches", payload, authSession?.accessToken);
        setApiNotice("Batch created.");
      }
      setTutorBatchDraft({ ...defaultTutorBatchDraft, programId, course: payload.course });
      await refreshTutorSupply();
      await refreshDashboardCards("tutor");
    } catch {
      setApiNotice("Batch could not be saved. Please check required fields and API deployment.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function archiveTutorBatch(batchId: string) {
    setLoadingAction("archiveTutorBatch:" + batchId);
    try {
      await apiPost(`/api/v1/tutor/batches/${batchId}/archive`, {}, authSession?.accessToken);
      setApiNotice("Batch archived.");
      await refreshTutorSupply();
      await refreshDashboardCards("tutor");
    } catch {
      setApiNotice("Batch could not be archived.");
    } finally {
      setLoadingAction(null);
    }
  }

  function editTutorBatch(batch: TutorBatchSummary) {
    setTutorBatchDraft({
      id: batch.id,
      programId: batch.programId ?? "",
      title: batch.title,
      course: batch.course,
      subject: batch.subject,
      grade: batch.grade,
      board: batch.board,
      mode: batch.mode,
      schedule: batch.schedule,
      classroomLocation: batch.classroomLocation ?? "",
      onlineLink: batch.onlineVideoLink ?? "",
      startsAt: batch.startsAt,
      capacity: String(batch.capacity),
      status: batch.status ?? "available",
      feeType: batch.feeType ?? "free",
      feeAmount: batch.feeAmount ? String(batch.feeAmount) : ""
    });
  }

  async function refreshStudentBatchRequests() {
    try {
      const response = await apiGet<{ data: BatchRequestSummary[] }>("/api/v1/usermanagement/batch-requests?role=student", authSession?.accessToken);
      setBatchRequests(response.data);
    } catch {
      setBatchRequests([]);
    }
  }

  async function approveBatchRequest(requestId: string) {
    setLoadingAction("approveRequest:" + requestId);
    try {
      await apiPost("/api/v1/usermanagement/batch-requests/" + requestId + "/approve", {}, authSession?.accessToken);
      setApiNotice("Student enrolled in batch.");
      await refreshBatchRequests();
      await refreshTutorSupply();
      await refreshClasses("tutor");
      await refreshDashboardCards("tutor");
      await refreshLearnerProgress("tutor");
    } catch {
      setApiNotice("Approval failed. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function actOnBatchRequest(requestId: string, action: "reject" | "defer" | "suggest" | "dismiss", suggestedBatchId?: string) {
    setLoadingAction(action + "Request:" + requestId);
    try {
      await apiPost("/api/v1/usermanagement/batch-requests/" + requestId + "/" + action, {
        message: action === "reject" ? "This batch is not the right fit right now." : action === "defer" ? "Let's revisit this after the next slot opens." : "Please consider another batch from my schedule.",
        suggestedBatchId
      }, authSession?.accessToken);
      if (role === "tutor") await refreshBatchRequests();
      if (role === "student") await refreshStudentBatchRequests();
      await refreshDashboardCards(role);
    } catch {
      setApiNotice("Batch request action failed. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function acceptSuggestedBatch(requestId: string) {
    setLoadingAction("acceptSuggestion:" + requestId);
    try {
      await apiPost("/api/v1/usermanagement/batch-requests/" + requestId + "/accept-suggestion", {}, authSession?.accessToken);
      setApiNotice("Suggested batch accepted. Tutor approval is pending.");
      await refreshStudentBatchRequests();
      await refreshClasses("student");
    } catch {
      setApiNotice("Suggested batch could not be accepted. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function withdrawBatchRequest(requestId: string) {
    setLoadingAction("withdrawRequest:" + requestId);
    try {
      await apiPost("/api/v1/usermanagement/batch-requests/" + requestId + "/withdraw", {}, authSession?.accessToken);
      setApiNotice("Batch request withdrawn.");
      await refreshStudentBatchRequests();
      await refreshTutorSearch();
    } catch {
      setApiNotice("Batch request could not be withdrawn. Please check API deployment and login state.");
    } finally {
      setLoadingAction(null);
    }
  }

  function restartPrototype() {
    setRole("student");
    setPhoneNumber("");
    setProfileDraft({ firstName: "", lastName: "", dob: "", city: "", communicationAddress: "", alternatePhone: "", curriculumBoards: [], curriculumClasses: [], curriculumSubjects: [], curriculumSelections: [] });
    setValueIndex(0);
    setConsent(false);
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
    setSigninPassword("");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetSeconds(0);
    setResetRequested(false);
    setActivationCode("");
    setActivationCodesByRelationship({});
    setActivationSeconds(0);
    setProfileDraft({ firstName: "", lastName: "", dob: "", city: "", communicationAddress: "", alternatePhone: "", curriculumBoards: [], curriculumClasses: [], curriculumSubjects: [], curriculumSelections: [] });
    setStream("senior");
    setSpecialization("CBSE Class 10 Mathematics");
    setAvatarUri(null);
    setReminders([]);
    setConnectedPeople("");
    setConnectedPeopleByReminder({});
    setIdentityContext(null);
    setApiPersona(null);
    setApiRecommendations(null);
    setDashboardCards(null);
    setApiMilestones(null);
    setPrograms([]);
    setSelectedPrograms([]);
    setSelectedProgramId(null);
    setAuthSession(null);
    setApiNotice("");
    setSignInMode("fresh");
    setScreen("role");
  }

  function updateOtp(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6).split("");
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] ?? ""));
  }

  async function sendOtp() {
    setLoadingAction("sendOtp");
    try {
      await apiPost("/api/v1/auth/register/start", { phone: phoneForApi, role });
      setApiNotice("");
      setScreen("otp");
    } catch {
      setApiNotice("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  async function completeRegistration() {
    setLoadingAction("completeRegistration");
    try {
      const response = await apiPost<{ data: AuthSession }>("/api/v1/auth/register/verify", {
        phone: phoneForApi,
        otp: otpValue,
        password,
        role,
        activationCode: role === "parent" ? parentActivationCode : undefined,
        profile: {
          firstName: profileDraft.firstName.trim(),
          lastName: profileDraft.lastName.trim(),
          dob: profileDraft.dob.trim(),
          city: profileDraft.city.trim(),
          communicationAddress: profileDraft.communicationAddress.trim(),
          alternatePhone: profileDraft.alternatePhone.trim(),
          stream,
          specialization,
          curriculumSelections: role === "parent" ? [] : profileDraft.curriculumSelections
        }
      });
      setAuthSession(response.data);
      setApiPersona({
        role,
        firstName: profileDraft.firstName.trim(),
        lastName: profileDraft.lastName.trim(),
        initials: `${profileDraft.firstName.charAt(0)}${profileDraft.lastName.charAt(0)}`.toUpperCase() || role.charAt(0).toUpperCase(),
        phone: phoneForApi,
        profileLabel: role === "parent" ? "Parent • myTution" : `${capitalize(role)} • ${stream} • ${curriculumLabel(profileDraft.curriculumSelections) ?? specialization}`
      });
      setApiNotice("");
      setProgramModalSeen(false);
      setScreen("sessions");
    } catch {
      setApiNotice("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  async function signInWithPassword() {
    setLoadingAction("signin");
    try {
      const response = await apiPost<{ data: AuthSession }>("/api/v1/auth/login", {
        phone: phoneForApi,
        password: signinPassword,
        role
      });
      setAuthSession(response.data);
      setApiNotice("");
      setProgramModalSeen(false);
      setScreen("home");
    } catch {
      setApiNotice("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  async function requestPasswordReset() {
    if (!phoneComplete) return;
    setLoadingAction("forgotPassword");
    try {
      const response = await apiPost<{ data: { resetSent: boolean; expiresInSeconds: number; resetHint?: string } }>("/api/v1/auth/password/forgot", {
        phone: phoneForApi,
        role
      });
      setResetRequested(true);
      setResetSeconds(response.data.expiresInSeconds ?? 60);
      setResetCode(response.data.resetHint ?? "");
      setApiNotice("");
    } catch {
      setApiNotice("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  async function resetPasswordWithCode() {
    if (!phoneComplete || resetCode.replace(/\D/g, "").length !== 6 || !resetPasswordValid) return;
    setLoadingAction("resetPassword");
    try {
      await apiPost("/api/v1/auth/password/reset", {
        phone: phoneForApi,
        role,
        code: resetCode,
        password: resetPassword
      });
      setSigninPassword("");
      setResetCode("");
      setResetPassword("");
      setResetConfirmPassword("");
      setResetRequested(false);
      setResetSeconds(0);
      setApiNotice("Password reset. Sign in with your new password.");
      setScreen("signin");
    } catch {
      setApiNotice("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  async function createReminder() {
    setLoadingAction("createReminder");
    const startsAt = combineReminderDateTime(reminderDate, reminderTime);
    const optimistic: Reminder = {
      id: `rem_${Date.now()}`,
      role,
      title: reminderTitle || "Untitled reminder",
      startsAt,
      status: "active"
    };
    setReminders((items) => [...items, optimistic]);
    if (connectedPeople.trim()) {
      setConnectedPeopleByReminder((items) => ({ ...items, [optimistic.id]: connectedPeople.trim() }));
    }
    try {
      const response = await apiPost<{ data: Reminder }>("/api/v1/events-reminders", {
        role,
        title: optimistic.title,
        startsAt,
        connectedPeople: connectedPeople.trim()
      }, authSession?.accessToken);
      setReminders((items) => items.map((item) => item.id === optimistic.id ? response.data : item));
      setConnectedPeopleByReminder((items) => {
        const next = { ...items };
        if (next[optimistic.id]) {
          next[response.data.id] = next[optimistic.id];
          delete next[optimistic.id];
        }
        return next;
      });
    } catch {
      setApiNotice("Reminder saved locally. API write failed.");
    } finally {
      setConnectedPeople("");
      setLoadingAction(null);
    }
  }

  function editReminder(reminder: Reminder) {
    setReminderTitle(reminder.title);
    setReminderDate(reminder.startsAt.split(" ")[0] || reminderDate);
    setReminderTime(reminder.startsAt.split(" ").slice(1).join(" ") || reminderTime);
    setConnectedPeople(connectedPeopleByReminder[reminder.id] ?? "");
    setReminders((items) => items.filter((item) => item.id !== reminder.id));
    setConnectedPeopleByReminder((items) => {
      const next = { ...items };
      delete next[reminder.id];
      return next;
    });
    setScreen("events");
  }

  async function deleteReminder(id: string) {
    setReminders((items) => items.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
    setConnectedPeopleByReminder((items) => {
      const next = { ...items };
      delete next[id];
      return next;
    });
    try {
      await apiDelete(`/api/v1/events-reminders/${id}`, authSession?.accessToken);
    } catch {
      setApiNotice("Reminder deleted locally. API write failed.");
    }
  }

  async function markNotificationRead(id: string) {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString(), status: "read" } : item));
    try {
      await apiPost(`/api/v1/notifications/${id}/read`, {}, authSession?.accessToken);
    } catch {
      // Keep the optimistic read state; notification read receipts are non-blocking.
    }
  }

  function openResource(resource: SelectedActivity) {
    setSelectedResource(resource);
    setResourceDetail(null);
    apiGet<{ data: ResourceDetailPayload }>(`/api/v1/resources/${resource.id}?role=${role}`, authSession?.accessToken)
      .then((response) => {
        setResourceDetail({
          ...resource,
          ...response.data,
          id: resource.id,
          role: resource.role,
          thumbnailLabel: resource.thumbnailLabel,
          milestoneId: resource.milestoneId,
          activityId: resource.activityId,
          activitySequence: resource.activitySequence,
          milestoneSequence: resource.milestoneSequence,
          milestoneTitle: resource.milestoneTitle,
          required: resource.required
        });
      })
      .catch(() => {
        setApiNotice("Resource detail could not be loaded from API.");
      });
    if (resource.type === "flashcard") {
      setScreen("flashIntro");
      return;
    }
    if (resource.type === "quiz") {
      setQuizPayload(null);
      setQuizAnswers([]);
      setQuizSubmitted([]);
      setQuizIndex(0);
      setScreen("quizIntro");
      return;
    }
    setScreen("resource");
  }

  function normalizeQuizAnswers(input: unknown, total: number): number[][] {
    const raw = Array.isArray(input) ? input : [];
    return Array.from({ length: total }, (_, index) => {
      const value = raw[index];
      if (Array.isArray(value)) return value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0);
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric >= 0 ? [numeric] : [];
    });
  }

  function normalizeQuizSubmitted(input: unknown, total: number, answers: number[][]): boolean[] {
    const raw = Array.isArray(input) ? input : [];
    return Array.from({ length: total }, (_, index) => Boolean(raw[index]) || answers[index]?.length > 0 && Boolean(raw[index]));
  }

  async function startQuiz(resource: SelectedActivity) {
    setLoadingAction("startQuiz");
    try {
      const response = await apiGet<{ data: QuizPayload }>(`/api/v1/resources/${resource.id}/quiz?role=${role}`, authSession?.accessToken);
      if (!response.data?.questions?.length) throw new Error("Quiz has no questions");
      const payload = response.data;
      const total = payload.questions.length;
      const checkpointAnswers = normalizeQuizAnswers(payload.checkpoint?.answers, total);
      const checkpointSubmitted = normalizeQuizSubmitted(payload.checkpoint?.submitted, total, checkpointAnswers);
      const firstUnsubmitted = checkpointSubmitted.findIndex((submitted) => !submitted);
      setQuizPayload(payload);
      setQuizAnswers(checkpointAnswers);
      setQuizSubmitted(checkpointSubmitted);
      setQuizIndex(firstUnsubmitted >= 0 ? firstUnsubmitted : Math.min(Math.max(0, Number(payload.checkpoint?.currentIndex) || 0), total - 1));
      setScreen("quizPlay");
      setApiNotice("");
    } catch {
      setApiNotice("Quiz could not be loaded from API. Please redeploy or check the API service.");
    } finally {
      setLoadingAction(null);
    }
  }

  function quizCorrectIndexes(question: QuizQuestion): number[] {
    return question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0];
  }

  function quizAnswerMatches(question: QuizQuestion, answer: number[]) {
    const expected = quizCorrectIndexes(question).slice().sort((a, b) => a - b);
    const actual = answer.slice().sort((a, b) => a - b);
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }

  async function submitQuizCheckpoint(nextAnswers: number[][], nextSubmitted: boolean[], currentIndex: number) {
    if (!selectedResource || selectedResource.type !== "quiz" || role !== "student") return;
    await apiPost(`/api/v1/resources/${selectedResource.id}/quiz-checkpoint`, {
      role,
      answers: nextAnswers,
      submitted: nextSubmitted,
      currentIndex,
      completed: false
    }, authSession?.accessToken).catch(() => {
      setApiNotice("Quiz checkpoint could not be saved. Please check API deployment and login state.");
    });
  }

  async function submitQuizAttemptAndComplete() {
    if (selectedResource?.type === "quiz" && quizPayload) {
      const score = quizPayload.questions.reduce((total, question, index) => total + (quizAnswerMatches(question, quizAnswers[index] ?? []) ? 1 : 0), 0);
      await apiPost<{ data: QuizAttemptSummary }>(`/api/v1/resources/${selectedResource.id}/quiz-attempts`, {
        role,
        answers: quizAnswers,
        score,
        total: quizPayload.questions.length
      }, authSession?.accessToken).catch(() => {
        setApiNotice("Quiz score could not be saved. Completion will still continue.");
      });
    }
    await markComplete();
  }

  function activityToResource(activity: NonNullable<ProgramMilestone["activities"]>[number], milestone: ProgramMilestone): SelectedActivity {
    return {
      id: activity.resourceId,
      role,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      thumbnailLabel: capitalize(activity.type),
      milestoneId: milestone.id,
      activityId: activity.id,
      activitySequence: activity.sequence,
      milestoneSequence: milestone.sequence
    };
  }

  function openMilestone(milestone: ProgramMilestone) {
    setSelectedMilestone(milestone);
    setScreen("milestoneDetail");
  }

  function openMilestoneActivity(milestone: ProgramMilestone, activityId?: string) {
    const nextActivity = activityId
      ? milestone.activities?.find((activity) => activity.id === activityId)
      : milestone.activities?.find((activity) => activity.status !== "complete") ?? milestone.activities?.[0];
    if (!nextActivity) {
      openResource({ id: milestone.id, role, type: "video", title: milestone.title, description: "Video • Article • Flashcard • Quiz", thumbnailLabel: "Milestone", milestoneId: milestone.id, milestoneSequence: milestone.sequence });
      return;
    }
    openResource(activityToResource(nextActivity, milestone));
  }
  function getNextMilestoneActivity(currentMilestoneId?: string): SelectedActivity | undefined {
    const milestones = apiMilestones ?? programMilestones;
    const currentMilestone = milestones.find((milestone) => milestone.id === currentMilestoneId);
    const nextMilestone = milestones.find((milestone) => milestone.sequence === (currentMilestone?.sequence ?? 0) + 1 && !milestone.locked);
    const nextActivity = nextMilestone?.activities?.find((activity) => activity.status !== "complete") ?? nextMilestone?.activities?.[0];
    return nextMilestone && nextActivity ? activityToResource(nextActivity, { ...nextMilestone, locked: false }) : undefined;
  }

  function refreshProgramFromApi() {
    setProgramRefreshKey((value) => value + 1);
  }

  async function markComplete() {
    setLoadingAction("markComplete");
    if (selectedResource) {
      setCompletedRecommendations((items) => items.includes(selectedResource.id) ? items : [...items, selectedResource.id]);
      let milestoneComplete = false;
      let nextActivity: SelectedActivity | undefined;
      if (selectedResource.activityId && selectedResource.milestoneId) {
        setApiMilestones((items) => (items ?? programMilestones).map((milestone) => {
          if (milestone.id !== selectedResource.milestoneId) {
            if (milestone.sequence === (selectedResource.milestoneSequence ?? 0) + 1) return { ...milestone, locked: false };
            return milestone;
          }
          const activities = milestone.activities?.map((activity) => activity.id === selectedResource.activityId ? { ...activity, status: "complete" as const } : activity);
          milestoneComplete = Boolean(activities?.every((activity) => activity.status === "complete"));
          const upcoming = activities?.find((activity) => activity.status !== "complete");
          if (upcoming) nextActivity = activityToResource(upcoming, { ...milestone, activities });
          return { ...milestone, activities };
        }));
        await apiPost(`/api/v1/education-plan/activities/${selectedResource.activityId}/complete`, { role, programId: selectedProgramId }, authSession?.accessToken).catch(() => undefined);
      } else {
        await apiPost(`/api/v1/resources/${selectedResource.id}/complete`, { role }, authSession?.accessToken).catch(() => undefined);
      }
      setLoadingAction(null);
      const nextMilestoneActivity = milestoneComplete && selectedResource.milestoneId ? getNextMilestoneActivity(selectedResource.milestoneId) : undefined;
      if (milestoneComplete && selectedResource.milestoneId) {
        setCompletedMilestone((value) => Math.max(value, selectedResource.milestoneSequence ?? value));
      }
      if (selectedResource.milestoneId) {
        setCompletedTopic({
          milestoneId: selectedResource.milestoneId,
          nextActivity,
          nextMilestoneActivity,
          milestoneComplete,
          programComplete: milestoneComplete && !nextMilestoneActivity && !nextActivity
        });
        return;
      }
      setSelectedResource(null);
      setScreen("sessions");
      return;
    }
    setLoadingAction(null);
  }

  async function loadParentActivation() {
    if (!authSession || role !== "student") return;
    try {
      const response = await apiGet<{ data: { parents: ParentLink[]; codes: Array<{ code: string; relationship: string; status: string; expiresAt?: string | null }> } }>("/api/v1/parent-activation?role=student", authSession.accessToken);
      setLinkedParents(response.data.parents ?? []);
      const now = Date.now();
      const nextCodes = (response.data.codes ?? []).reduce<Record<string, { code: string; expiresAt: number }>>((items, item) => {
        const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : now + 60000;
        if (item.status === "active" && expiresAt > now) items[item.relationship] = { code: item.code, expiresAt };
        return items;
      }, {});
      setActivationCodesByRelationship(nextCodes);
    } catch {
      // Account invite data is optional for local previews.
    }
  }

  async function generateActivationCode() {
    if (!authSession || role !== "student") return;
    setLoadingAction("generateActivation");
    try {
      const response = await apiPost<{ data: { code: string; relationship: string; expiresAt?: string | null } }>("/api/v1/parent-activation", { relationship: activationRelationship }, authSession.accessToken);
      const expiresAt = response.data.expiresAt ? new Date(response.data.expiresAt).getTime() : Date.now() + 60000;
      setActivationCodesByRelationship((items) => ({ ...items, [response.data.relationship]: { code: response.data.code, expiresAt } }));
      await loadParentActivation();
      setApiNotice("");
    } catch {
      setApiNotice("Activation code could not be generated. Please check API service.");
    } finally {
      setLoadingAction(null);
    }
  }

  function renderScreen() {
    if (screen === "role") {
      return (
        <>
          <View style={styles.roleLandingBrand}>
            <Image source={icon} style={styles.roleLandingLogo} resizeMode="contain" />
            <Text style={styles.freshSigninBrand}>myTution</Text>
          </View>
          {(["student", "tutor", "parent"] as Role[]).map((item) => (
            <Card key={item} role={role} selected={role === item} onPress={() => {
              setRole(item);
              setPhoneNumber("");
              setProfileDraft({ firstName: "", lastName: "", dob: "", city: "", communicationAddress: "", alternatePhone: "", curriculumBoards: [], curriculumClasses: [], curriculumSubjects: [], curriculumSelections: [] });
              setSelectedProgramId(null);
              setConsent(false);
            }}>
              <Avatar role={item} label={item[0].toUpperCase()} />
              <View style={styles.flex}>
                <CardTitle>{capitalize(item)}</CardTitle>
                <Muted>{item === "student" ? "Discover tutors and book trial classes." : item === "tutor" ? "Manage leads, calendar, and payments." : "Track classes, payments, and progress."}</Muted>
              </View>
              <Text style={styles.check}>{role === item ? "✓" : ""}</Text>
            </Card>
          ))}
          <View style={styles.signinActions}>
            <Button role={role} label="Sign in" onPress={() => setScreen("signin")} />
            <Pressable style={({ pressed }) => [styles.registerLink, pressed && styles.pressed]} onPress={() => { setValueIndex(0); setScreen("value"); }}>
              <Text style={styles.registerLinkText}>Don't have an account? Register Now!!</Text>
            </Pressable>
          </View>
        </>
      );
    }

    if (screen === "value") {
      const prop = roleValueProps[role][valueIndex];
      const last = valueIndex === roleValueProps[role].length - 1;
      return (
        <>
          <TopBar title="Why myTution" left="‹" onLeft={() => setScreen("role")} right={last ? "" : "Skip"} onRight={() => setScreen("phone")} />
          <View style={styles.valueStage}>
            <View style={[styles.propArt, { backgroundColor: theme.surface }]}>
              <Image source={valuePropImages[role][valueIndex] ?? valuePropImages[role][0]} style={styles.propImage} resizeMode="contain" />
            </View>
            <View style={styles.valueCopy}>
              <Title>{prop.title}</Title>
              <Muted>{prop.desc}</Muted>
            </View>
          </View>
          <Button role={role} label={last ? "Get started" : "Next"} onPress={() => last ? setScreen("phone") : setValueIndex((index) => index + 1)} />
        </>
      );
    }

    if (screen === "phone") {
      return (
        <>
          <TopBar title="Consent" left="‹" onLeft={() => setScreen("value")} />
          <Title>Register with phone</Title>
          <Muted>Accept consent before entering your number. This will be stored with the current policy version.</Muted>
          <ConsentCard role={role} checked={consent} onPress={() => setConsent(!consent)} />
          <FieldLabel>Phone number</FieldLabel>
          <Input
            editable={consent}
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
          <Button disabled={!consent || !phoneComplete} loading={loadingAction === "sendOtp"} role={role} label="Send OTP" onPress={sendOtp} />
        </>
      );
    }

    if (screen === "otp") {
      return (
        <>
          <TopBar title="Verification" left="‹" onLeft={() => setScreen("phone")} />
          <Title>Enter OTP</Title>
          <Muted>We sent a 6 digit code to {phoneForApi}.</Muted>
          <OtpInput value={otpValue} digits={otp} onChange={updateOtp} />
          <Button disabled={!otpComplete} role={role} label="Verify OTP" onPress={() => setScreen("createPassword")} />
          <Text style={[styles.linkText, { color: theme.text }]}>Resend OTP in {otpSeconds}s {otpSeconds === 0 ? "Resend OTP" : ""}</Text>
        </>
      );
    }

    if (screen === "createPassword") {
      return (
        <>
          <TopBar title="Password" left="‹" onLeft={() => setScreen("otp")} />
          <Title>Create password</Title>
          <Muted>Use this with your phone number to sign in later.</Muted>
          <FieldLabel>Password</FieldLabel>
          <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" />
          <FieldLabel>Confirm password</FieldLabel>
          <Input secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" />
          <Muted>{passwordValid ? "Password confirmed." : "Passwords must match and be at least 8 characters."}</Muted>
          <Button disabled={!passwordValid} role={role} label="Continue" onPress={() => setScreen(role === "parent" ? "activation" : "profile")} />
        </>
      );
    }

    if (screen === "activation") {
      return (
        <>
          <TopBar title="Activation" left="‹" onLeft={() => setScreen("createPassword")} />
          <Title>Enter activation code</Title>
          <Muted>Use the 6 digit code shared by the student to link this parent account.</Muted>
          <Input
            value={parentActivationCode}
            onChangeText={(value) => setParentActivationCode(value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 digit code"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button disabled={parentActivationCode.length !== 6} role={role} label="Continue" onPress={() => setScreen("profile")} />
        </>
      );
    }

    if (screen === "profile") {
      return (
        <ProfileForm
          role={role}
          persona={persona}
          draft={profileDraft}
          setDraft={setProfileDraft}
          avatarUri={avatarUri}
          pickAvatar={pickAvatar}
          openDatePicker={() => setPicker({ target: "dob", mode: "date", value: parseDisplayDate(profileDraft.dob) ?? new Date(2010, 5, 24) })}
          stream={stream}
          specialization={specialization}
          curriculumCatalogue={curriculumCatalogue}
          setStream={(value) => {
            setStream(value);
            setSpecialization(specializationOptions[value][0]);
          }}
          setSpecialization={setSpecialization}
          title="Complete your profile"
          cta="Finish registration"
          loading={loadingAction === "completeRegistration"}
          disabled={!profileDraft.firstName.trim() || !profileDraft.lastName.trim()}
          onSubmit={completeRegistration}
        />
      );
    }

    if (screen === "editProfile") {
      return (
        <ProfileForm
          role={role}
          persona={persona}
          draft={profileDraft}
          setDraft={setProfileDraft}
          avatarUri={avatarUri}
          pickAvatar={pickAvatar}
          openDatePicker={() => setPicker({ target: "dob", mode: "date", value: parseDisplayDate(profileDraft.dob) ?? new Date(2010, 5, 24) })}
          stream={stream}
          specialization={specialization}
          curriculumCatalogue={curriculumCatalogue}
          setStream={(value) => {
            setStream(value);
            setSpecialization(specializationOptions[value][0]);
          }}
          setSpecialization={setSpecialization}
          title="Edit profile"
          cta="Save profile"
          back={() => setScreen("account")}
          loading={loadingAction === "saveProfile"}
          disabled={!profileDraft.firstName.trim() || !profileDraft.lastName.trim()}
          onSubmit={async () => {
            setLoadingAction("saveProfile");
            try {
              await apiPut("/api/v1/usermanagement/profile", {
                role,
                firstName: profileDraft.firstName.trim(),
                lastName: profileDraft.lastName.trim(),
                dob: profileDraft.dob.trim(),
                city: profileDraft.city.trim(),
                communicationAddress: profileDraft.communicationAddress.trim(),
                alternatePhone: profileDraft.alternatePhone.trim(),
                stream,
                specialization,
                curriculumSelections: role === "parent" ? [] : profileDraft.curriculumSelections
              }, authSession?.accessToken);
              setApiPersona({
                role,
                firstName: profileDraft.firstName.trim(),
                lastName: profileDraft.lastName.trim(),
                initials: `${profileDraft.firstName.charAt(0)}${profileDraft.lastName.charAt(0)}`.toUpperCase() || role.charAt(0).toUpperCase(),
                phone: phoneForApi,
                profileLabel: role === "parent" ? "Parent • myTution" : `${capitalize(role)} • ${stream} • ${curriculumLabel(profileDraft.curriculumSelections) ?? specialization}`
              });
              setApiNotice("");
            } catch {
              setApiNotice("Profile saved locally. API write failed.");
            } finally {
              setLoadingAction(null);
            }
            setScreen("account");
          }}
        />
      );
    }

    if (screen === "signin") {
      return (
        <SignInScreen
          role={role}
          mode={signInMode}
          persona={persona}
          avatarUri={avatarUri}
          restart={restartPrototype}
          phoneNumber={phoneNumber}
          setPhoneNumber={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 10))}
          password={signinPassword}
          setPassword={setSigninPassword}
          canSignIn={phoneComplete && !!signinPassword}
          loading={loadingAction === "signin"}
          apiNotice={apiNotice}
          signIn={signInWithPassword}
          forgotPassword={() => {
            setResetRequested(false);
            setResetCode("");
            setResetPassword("");
            setResetConfirmPassword("");
            setResetSeconds(0);
            setApiNotice("");
            setScreen("forgotPassword");
          }}
          register={() => { setValueIndex(0); setScreen("value"); }}
        />
      );
    }

    if (screen === "forgotPassword") {
      return (
        <ForgotPasswordScreen
          role={role}
          phoneNumber={phoneNumber}
          setPhoneNumber={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 10))}
          resetRequested={resetRequested}
          resetCode={resetCode}
          setResetCode={(value) => setResetCode(value.replace(/\D/g, "").slice(0, 6))}
          resetSeconds={resetSeconds}
          resetPassword={resetPassword}
          setResetPassword={setResetPassword}
          resetConfirmPassword={resetConfirmPassword}
          setResetConfirmPassword={setResetConfirmPassword}
          canRequest={phoneComplete}
          canReset={phoneComplete && resetCode.length === 6 && resetPasswordValid && resetSeconds > 0}
          loadingAction={loadingAction}
          apiNotice={apiNotice}
          requestReset={requestPasswordReset}
          submitReset={resetPasswordWithCode}
          back={() => setScreen("signin")}
        />
      );
    }

    if (screen === "home") {
      return (
        <>
          <Header role={role} personaName={`${persona.firstName} ${persona.lastName}`} />
          {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
          <TrackCard role={role} onPress={() => setScreen(role === "student" ? "search" : role === "tutor" ? "roleHub" : "sessions")} />
          <NotificationStrip role={role} notifications={notifications} onRead={markNotificationRead} />

          {role === "student" && marketplaceRecommendations ? (
            <MarketplaceHomeSection
              data={marketplaceRecommendations}
              onOpen={(target) => {
                setMarketplaceTarget(target);
                setScreen("search");
              }}
            />
          ) : null}

          {role === "student" || role === "parent" ? (
            <>
              {programComplete ? <ProgramCompletedCard role={role} onPress={() => setScreen("sessions")} /> : <ProgramJourneyCard role={role} milestones={homeMilestones} completedMilestone={completedMilestone} onPress={() => setScreen("sessions")} />}
              {!recommendationsReady ? (
                <View style={styles.smartPickCard}>
                  <ActivityIndicator color={theme.accentStrong} />
                  <Muted>Loading program activities</Muted>
                </View>
              ) : (
                <>
                  <JourneyResourceCarousel title="For you today" role={role} items={forYouTodayActivities} emptyCopy="No required activities pending." onPress={openResource} />
                </>
              )}
            </>
          ) : isFeatureEnabled("recommendations", role) && (
            <>
              {!recommendationsReady ? (
                <View style={styles.smartPickCard}>
                  <ActivityIndicator color={theme.accentStrong} />
                  <Muted>Loading smart picks</Muted>
                </View>
              ) : (
                <>
                  {role === "tutor" ? (
                    <JourneyResourceCarousel title="Recommended for you" role={role} items={forYouTodayActivities.length ? forYouTodayActivities : roleRecommendations.map((item) => ({ ...item, milestoneTitle: "Teaching picks", milestoneSequence: 1, activitySequence: 1, required: true, status: "pending" as const }))} emptyCopy="No required activities pending." onPress={openResource} />
                  ) : (
                    <>
                      <SectionTitle>Recommended for you</SectionTitle>
                      {roleRecommendations.length ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.carousel}>
                          {roleRecommendations.map((item) => (
                            <RecommendationTile key={item.id} role={role} item={item} onPress={() => openResource(item)} />
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.emptyInlineCard}>
                          <Text style={styles.todayTitle}>All caught up</Text>
                          <Text style={styles.todayMeta}>Completed picks are removed from Home.</Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          <SectionTitle>Events & reminders</SectionTitle>
          {roleReminders.length === 0 ? (
            <ReminderComposer
              role={role}
              title={reminderTitle}
              date={reminderDate}
              time={reminderTime}
              setTitle={setReminderTitle}
              setDate={setReminderDate}
              setTime={setReminderTime}
              openDatePicker={() => setPicker({ target: "reminderDate", mode: "date", value: parseDisplayDate(reminderDate) ?? new Date() })}
              openTimePicker={() => setPicker({ target: "reminderTime", mode: "time", value: parseDisplayTime(reminderTime) })}
              onCreate={createReminder}
              loading={loadingAction === "createReminder"}
            />
          ) : (
            <ReminderPreviewCard role={role} reminders={roleReminders.slice(0, reminderPreviewLimit)} />
          )}
          {roleReminders.length > reminderPreviewLimit ? (
            <Pressable style={({ pressed }) => [styles.viewAllCard, pressed && styles.pressed]} onPress={() => setScreen("events")}>
              <Text style={[styles.viewAllText, { color: theme.text }]}>View all reminders</Text>
            </Pressable>
          ) : null}

          {role === "student" ? <StudentBatchRequestAlerts role={role} requests={batchRequests} openTutorSearch={() => setScreen("search")} acceptSuggestion={acceptSuggestedBatch} withdrawRequest={withdrawBatchRequest} dismiss={(id) => actOnBatchRequest(id, "dismiss")} actionLoading={loadingAction} /> : null}
          {role === "parent" ? <ParentMonitoringPanel data={parentMonitoring} openProgram={() => setScreen("sessions")} openClasses={() => setScreen("roleHub")} /> : null}

          <SectionTitle>Dashboard</SectionTitle>
          <DashboardGrid role={role} cards={dashboardCards} setScreen={setScreen} />
        </>
      );
    }

    if (screen === "search" && role === "student") return <TutorDiscovery role={role} tutors={tutorResults} marketplaceTarget={marketplaceTarget} clearTargetTutor={() => setMarketplaceTarget(null)} options={tutorFilterOptions} loading={tutorSearchLoading} requestBatch={requestBatch} addTutorProgram={addTutorProgramToStudent} requestProgramPurchase={requestProgramPurchase} requestLoading={loadingAction} search={refreshTutorSearch} back={() => { setMarketplaceTarget(null); setScreen("home"); }} />;
    if (screen === "search") return <SimpleScreen title="Tutor leads" role={role} back={() => setScreen("home")} />;
    if (screen === "payments") return <Payments role={role} accessToken={authSession?.accessToken} back={() => setScreen("account")} />;
    if (screen === "roleHub") return <RoleHub role={role} classes={batchClasses} requests={batchRequests} learnerProgress={learnerProgress} loading={classHubLoading} approveRequest={approveBatchRequest} requestAction={actOnBatchRequest} actionLoading={loadingAction} back={() => setScreen("home")} tutorSupply={tutorSupply} batchDraft={tutorBatchDraft} setBatchDraft={setTutorBatchDraft} saveBatch={saveTutorBatch} editBatch={editTutorBatch} archiveBatch={archiveTutorBatch} refreshSupply={refreshTutorSupply} />;
    if (screen === "chat") return <Chat role={role} accessToken={authSession?.accessToken} back={() => setScreen("home")} />;
    if (screen === "account") return <Account role={role} persona={persona} avatarUri={avatarUri} signOut={async () => { if (authSession) await apiPost("/api/v1/auth/revoke", { refreshToken: authSession.refreshToken }, authSession.accessToken).catch(() => undefined); setAuthSession(null); setIdentityContext(null); setSignInMode("returning"); setScreen("signin"); }} setScreen={setScreen} onEditProfile={() => {
      const profile = identityContext?.activeProfile;
      if (profile) {
        setProfileDraft({
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          dob: profile.dob ? formatDisplayDate(new Date(profile.dob)) : "",
          city: profile.city ?? "",
          communicationAddress: profile.communicationAddress ?? "",
          alternatePhone: profile.alternatePhone ?? "",
          curriculumBoards: dedupe((profile.curriculumSelections ?? []).map((item) => item.board)),
          curriculumClasses: dedupe((profile.curriculumSelections ?? []).map((item) => item.classLevel)),
          curriculumSubjects: dedupe((profile.curriculumSelections ?? []).map((item) => item.subject)),
          curriculumSelections: profile.curriculumSelections ?? []
        });
        const firstSelection = profile.curriculumSelections?.[0];
        setStream((profile.stream as StreamKey) ?? "senior");
        setSpecialization(profile.specialization ?? (firstSelection ? `${firstSelection.board} ${firstSelection.classLevel} ${firstSelection.subject}` : specialization));
      }
      setScreen("editProfile");
    }} requests={batchRequests} approveRequest={approveBatchRequest} requestAction={actOnBatchRequest} actionLoading={loadingAction} generateActivationCode={generateActivationCode} activationCode={activationCode} activationSeconds={activationSeconds} activationRelationship={activationRelationship} setActivationRelationship={setActivationRelationship} parents={linkedParents} />;
    if (screen === "ratings") return <Ratings role={role} back={() => setScreen("home")} />;
    if (screen === "events") return <Events role={role} reminders={roleReminders} connectedPeopleByReminder={connectedPeopleByReminder} editReminder={editReminder} deleteReminder={deleteReminder} back={() => setScreen("home")} title={reminderTitle} date={reminderDate} time={reminderTime} setTitle={setReminderTitle} setDate={setReminderDate} setTime={setReminderTime} connectedPeople={connectedPeople} setConnectedPeople={setConnectedPeople} openDatePicker={() => setPicker({ target: "reminderDate", mode: "date", value: parseDisplayDate(reminderDate) ?? new Date() })} openTimePicker={() => setPicker({ target: "reminderTime", mode: "time", value: parseDisplayTime(reminderTime) })} createReminder={createReminder} loading={loadingAction === "createReminder"} />;
    if (screen === "sessions") return <Sessions role={role} programs={programs} selectedPrograms={selectedPrograms} selectedProgramId={selectedProgramId} programDataReady={!authSession?.accessToken || apiMilestones !== null || programs.length > 0} switchProgram={(programId) => { setSelectedProgramId(programId); setProgramRefreshKey((value) => value + 1); }} milestones={apiMilestones ?? programMilestones} completedMilestone={completedMilestone} openMilestone={openMilestone} menuOpen={programMenuOpen} setMenuOpen={setProgramMenuOpen} openProgramPicker={openProgramPicker} archiveProgram={archiveTutorProgram} restoreProgram={restoreTutorProgram} archiveModalVisible={programArchiveModalVisible} setArchiveModalVisible={setProgramArchiveModalVisible} publishProgram={publishTutorProgram} tutorProgramDraft={tutorProgramDraft} setTutorProgramDraft={setTutorProgramDraft} tutorProgramComposerOpen={tutorProgramComposerOpen} setTutorProgramComposerOpen={setTutorProgramComposerOpen} createTutorProgram={createTutorProgram} createTutorProgramLoading={loadingAction === "createTutorProgram"} editingProgramId={editingTutorProgramId} setEditingProgramId={setEditingTutorProgramId} loadTutorProgramForEdit={loadTutorProgramForEdit} loadingAction={loadingAction} />;
    if (screen === "milestoneDetail" && selectedMilestone) {
      const selectedProgram = programs.find((program) => program.id === selectedProgramId);
      return <MilestoneDetail role={role} milestone={selectedMilestone} openActivity={(activityId) => openMilestoneActivity(selectedMilestone, activityId)} back={() => setScreen("sessions")} editableActivities={role === "tutor" && !isPublishedProgram(selectedProgram)} onEditActivity={editTutorActivityFromMilestone} />;
    }
    if (screen === "resource" && selectedResource) return <ResourceDetail role={role} resource={resourceDetail ?? selectedResource} complete={markComplete} loading={loadingAction === "markComplete"} back={() => setScreen(selectedMilestone ? "milestoneDetail" : "sessions")} completedTopic={completedTopic} continueActivity={() => { const next = completedTopic?.nextActivity; setCompletedTopic(null); if (next) openResource(next); }} nextMilestone={() => { const next = completedTopic?.nextMilestoneActivity; setCompletedTopic(null); if (next) openResource(next); }} backToProgram={() => { setCompletedTopic(null); setSelectedResource(null); refreshProgramFromApi(); setScreen("sessions"); }} backToHome={() => { setCompletedTopic(null); setSelectedResource(null); refreshProgramFromApi(); setScreen("home"); }} />;
    if (screen === "flashIntro" && selectedResource) return <FlashIntro role={role} resource={resourceDetail ?? selectedResource} start={() => { setFlashIndex(0); setFlashAnswer(false); setScreen("flashPlay"); }} back={() => setScreen(selectedMilestone ? "milestoneDetail" : "home")} />;
    if (screen === "flashPlay" && selectedResource) {
      const cards = resourceDetail?.id === selectedResource.id && resourceDetail.flashcards?.length ? resourceDetail.flashcards : fallbackFlashcards;
      return <FlashPlay role={role} resource={resourceDetail ?? selectedResource} cards={cards} index={flashIndex} answer={flashAnswer} setAnswer={setFlashAnswer} next={() => { setFlashIndex((flashIndex + 1) % cards.length); setFlashAnswer(false); }} learnMore={() => {
        const articleId = cards[flashIndex]?.relatedArticleId;
        if (articleId) openResource({ id: articleId, role, type: "article", title: "Learn more", description: "Related article for this flashcard.", thumbnailLabel: "Article" });
      }} complete={markComplete} back={() => setScreen(selectedMilestone ? "milestoneDetail" : "sessions")} />;
    }
    if (screen === "quizIntro" && selectedResource) return <QuizIntro role={role} resource={resourceDetail ?? selectedResource} loading={loadingAction === "startQuiz"} start={() => startQuiz(selectedResource)} back={() => setScreen(selectedMilestone ? "milestoneDetail" : "sessions")} />;
    if (screen === "quizPlay" && selectedResource && quizPayload) return <QuizPlay
      role={role}
      payload={quizPayload}
      index={quizIndex}
      answers={quizAnswers}
      submitted={quizSubmitted}
      setAnswer={(answer) => setQuizAnswers((items) => items.map((item, itemIndex) => itemIndex === quizIndex ? answer : item))}
      submit={() => {
        const nextSubmitted = quizSubmitted.map((item, itemIndex) => itemIndex === quizIndex ? true : item);
        setQuizSubmitted(nextSubmitted);
        void submitQuizCheckpoint(quizAnswers, nextSubmitted, quizIndex);
      }}
      next={() => { if (quizIndex === quizPayload.questions.length - 1) setScreen("quizResult"); else setQuizIndex(quizIndex + 1); }}
      back={() => setScreen(selectedMilestone ? "milestoneDetail" : "sessions")}
    />;
    if (screen === "quizResult" && selectedResource && quizPayload) return <QuizResult role={role} payload={quizPayload} answers={quizAnswers} complete={submitQuizAttemptAndComplete} loading={loadingAction === "markComplete"} backToTopic={() => { refreshProgramFromApi(); setScreen("sessions"); }} />;

    return null;
  }

  const showNav = ["home", "sessions", "events", "chat", "account"].includes(screen);

  if (showAppSplash) {
    return <AppSplash />;
  }

  return (
    <LinearGradient colors={screenGradient(role)} style={styles.shell}>
      <ScrollView contentContainerStyle={[styles.content, screen === "home" && styles.homeContent, screen === "value" && styles.valueContent, showNav && styles.contentWithNav]}>
        {renderScreen()}
      </ScrollView>
      {showNav && <BottomNav role={role} screen={screen} setScreen={setScreen} />}
      {picker && (
        <DateTimePicker
          value={picker.value}
          mode={picker.mode}
          display="spinner"
          onChange={(event, selectedDate) => {
            const next = selectedDate ?? picker.value;
            if (event.type !== "dismissed") {
              if (picker.target === "dob") setProfileDraft((draft) => ({ ...draft, dob: formatDisplayDate(next) }));
              if (picker.target === "reminderDate") setReminderDate(formatDisplayDate(next));
              if (picker.target === "reminderTime") setReminderTime(formatDisplayTime(next));
            }
            setPicker(null);
          }}
        />
      )}
      <ProgramPickerModal
        role={role}
        visible={programModalVisible}
        programs={programs}
        selectedPrograms={selectedPrograms}
        selectedProgramId={draftProgramId ?? selectedProgramId}
        setSelectedProgramId={setDraftProgramId}
        preparing={programPreparing}
        canClose={programModalCanClose}
        onClose={() => setProgramModalVisible(false)}
        onContinue={() => prepareProgram(draftProgramId)}
      />
      {programToast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{programToast}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function AppSplash() {
  return (
    <View style={styles.appSplashShell}>
      <Image source={icon} style={styles.appSplashLogo} resizeMode="contain" />
      <Text style={styles.freshSigninBrand}>myTution</Text>
    </View>
  );
}

function screenGradient(role: Role): [string, string, string] {
  if (role === "tutor") return ["#FEFEF7", "#F2EFA2", "#F3F6F9"];
  if (role === "student") return ["#FDFBFE", "#F1DDFB", "#F3F6F9"];
  return ["#F7FCFD", "#C9F0F5", "#F3F6F9"];
}

function buttonGradient(role: Role, disabled?: boolean): [string, string] {
  if (disabled) return ["#E5E7EB", "#D1D5DB"];
  if (role === "tutor") return ["#B19C00", "#E0D731"];
  if (role === "student") return ["#8F6BD8", "#C3A2EF"];
  return ["#1AA6B4", "#78D3DD"];
}

function Header({ role, personaName }: { role: Role; personaName: string }) {
  const theme = useRoleTheme(role);
  return (
    <View style={styles.header}>
      <View>
        <Muted>Good Afternoon</Muted>
        <Title>{personaName}</Title>
      </View>
      <Text style={[styles.headerIcon, { color: theme.accentStrong }]}>⌁</Text>
    </View>
  );
}

function SignInScreen({
  role,
  mode,
  persona,
  avatarUri,
  restart,
  phoneNumber,
  setPhoneNumber,
  password,
  setPassword,
  canSignIn,
  loading,
  apiNotice,
  signIn,
  forgotPassword,
  register
}: {
  role: Role;
  mode: SignInMode;
  persona: typeof personas[Role];
  avatarUri: string | null;
  restart: () => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  canSignIn: boolean;
  loading: boolean;
  apiNotice: string;
  signIn: () => void;
  forgotPassword: () => void;
  register: () => void;
}) {
  const theme = useRoleTheme(role);
  return (
    <>
      <View style={styles.signinFormBrand}>
        <Image source={icon} style={styles.freshSigninLogo} resizeMode="contain" />
        <Text style={styles.freshSigninBrand}>myTution</Text>
        <Text style={styles.freshSigninCopy}>Sign in to continue your learning journey.</Text>
      </View>
      {mode === "returning" ? (
        <View style={styles.signinCard}>
          <Avatar role={role} label={persona.initials} uri={avatarUri} />
          <View style={styles.flex}>
            <Text style={styles.signinKicker}>Welcome back</Text>
            <Text style={styles.signinName}>{persona.firstName} {persona.lastName}</Text>
          </View>
          <Text style={styles.signinCopy}>{capitalize(role)} dashboard is ready. Sign in with phone and password to continue.</Text>
        </View>
      ) : null}
      <FieldLabel>Phone number</FieldLabel>
      <Input
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="9876543210"
      />
      <FieldLabel>Password</FieldLabel>
      <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
      <Pressable style={({ pressed }) => [styles.forgotPasswordLink, pressed && styles.pressed]} onPress={forgotPassword}>
        <Text style={[styles.forgotPasswordText, { color: theme.text }]}>Forgot password?</Text>
      </Pressable>
      {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
      <View style={styles.signinActions}>
        <Button disabled={!canSignIn} loading={loading} role={role} label="Sign in" onPress={signIn} />
        {mode === "fresh" ? (
          <Pressable style={({ pressed }) => [styles.registerLink, pressed && styles.pressed]} onPress={register}>
            <Text style={styles.registerLinkText}>Don't have an account? Register Now!!</Text>
          </Pressable>
        ) : (
          <Button role={role} variant="secondary" label="Restart prototype" onPress={restart} />
        )}
      </View>
    </>
  );
}

function ForgotPasswordScreen({
  role,
  phoneNumber,
  setPhoneNumber,
  resetRequested,
  resetCode,
  setResetCode,
  resetSeconds,
  resetPassword,
  setResetPassword,
  resetConfirmPassword,
  setResetConfirmPassword,
  canRequest,
  canReset,
  loadingAction,
  apiNotice,
  requestReset,
  submitReset,
  back
}: {
  role: Role;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  resetRequested: boolean;
  resetCode: string;
  setResetCode: (value: string) => void;
  resetSeconds: number;
  resetPassword: string;
  setResetPassword: (value: string) => void;
  resetConfirmPassword: string;
  setResetConfirmPassword: (value: string) => void;
  canRequest: boolean;
  canReset: boolean;
  loadingAction: string | null;
  apiNotice: string;
  requestReset: () => void;
  submitReset: () => void;
  back: () => void;
}) {
  const expired = resetRequested && resetSeconds === 0;
  return (
    <>
      <TopBar title="Reset password" left="‹" onLeft={back} />
      <Title>Forgot password?</Title>
      <Muted>Enter your registered phone number. We will generate a 6 digit reset code valid for 60 seconds.</Muted>
      <FieldLabel>Phone number</FieldLabel>
      <Input value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" />
      <Button role={role} label={resetRequested && resetSeconds > 0 ? `Code sent • ${resetSeconds}s` : "Send reset code"} disabled={!canRequest || (resetRequested && resetSeconds > 0)} loading={loadingAction === "forgotPassword"} onPress={requestReset} />
      {resetRequested ? (
        <>
          <FieldLabel>Reset code</FieldLabel>
          <Input value={resetCode} onChangeText={setResetCode} keyboardType="number-pad" maxLength={6} placeholder={expired ? "Code expired" : "6 digit code"} />
          {expired ? <Muted>Code expired. Generate a new reset code.</Muted> : <Muted>Use the latest reset code before the timer ends.</Muted>}
          <FieldLabel>New password</FieldLabel>
          <Input secureTextEntry value={resetPassword} onChangeText={setResetPassword} placeholder="Minimum 8 characters" />
          <FieldLabel>Confirm new password</FieldLabel>
          <Input secureTextEntry value={resetConfirmPassword} onChangeText={setResetConfirmPassword} placeholder="Confirm password" />
          <Button role={role} label="Reset password" disabled={!canReset} loading={loadingAction === "resetPassword"} onPress={submitReset} />
        </>
      ) : null}
      {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
    </>
  );
}

function ConsentCard({ role, checked, onPress }: { role: Role; checked: boolean; onPress: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable style={styles.consentCard} onPress={onPress}>
      <View style={[styles.consentCheck, checked && { backgroundColor: theme.accentStrong, borderColor: theme.accentStrong }]}>
        <Text style={styles.consentCheckText}>{checked ? "✓" : ""}</Text>
      </View>
      <Text style={styles.consentText}>I agree to the Terms, Privacy Policy, and communication consent for OTP, class, payment, and account updates.</Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function OtpInput({ value, digits, onChange }: { value: string; digits: string[]; onChange: (value: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable style={styles.otpShell} onPress={() => inputRef.current?.focus()}>
      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <View key={index} style={[styles.otpInput, digit && styles.otpInputFilled]}>
            <Text style={styles.otpDigit}>{digit}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        style={styles.otpHiddenInput}
      />
    </Pressable>
  );
}

function ProfileForm({
  role,
  persona,
  draft,
  setDraft,
  avatarUri,
  pickAvatar,
  openDatePicker,
  stream,
  specialization,
  curriculumCatalogue,
  setStream,
  setSpecialization,
  title,
  cta,
  back,
  onSubmit,
  loading,
  disabled
}: {
  role: Role;
  persona: typeof personas[Role];
  draft: ProfileDraft;
  setDraft: (value: ProfileDraft) => void;
  avatarUri: string | null;
  pickAvatar: () => void;
  openDatePicker: () => void;
  stream: StreamKey;
  specialization: string;
  curriculumCatalogue: CurriculumCatalogueResponse;
  setStream: (value: StreamKey) => void;
  setSpecialization: (value: string) => void;
  title: string;
  cta: string;
  back?: () => void;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useRoleTheme(role);
  const streamLabel = streamOptions.find((item) => item.value === stream)?.label ?? "Senior";
  const initials = `${draft.firstName.charAt(0)}${draft.lastName.charAt(0)}`.toUpperCase() || persona.initials;
  const updateDraft = (patch: Partial<ProfileDraft>) => setDraft({ ...draft, ...patch });
  const selectedBoards = draft.curriculumBoards.length ? draft.curriculumBoards : dedupe(draft.curriculumSelections.map((item) => item.board));
  const selectedClasses = draft.curriculumClasses.length ? draft.curriculumClasses : dedupe(draft.curriculumSelections.map((item) => item.classLevel));
  const selectedSubjects = draft.curriculumSubjects.length ? draft.curriculumSubjects : dedupe(draft.curriculumSelections.map((item) => item.subject));
  const boardOptions = curriculumCatalogue.boards.map((board) => board.id);
  const classOptions = dedupe(curriculumCatalogue.boards
    .filter((board) => !selectedBoards.length || selectedBoards.includes(board.id))
    .flatMap((board) => board.classes.map((item) => item.label)));
  const subjectOptions = dedupe(curriculumCatalogue.boards
    .filter((board) => !selectedBoards.length || selectedBoards.includes(board.id))
    .flatMap((board) => board.classes)
    .filter((item) => !selectedClasses.length || selectedClasses.includes(item.label))
    .flatMap((item) => item.subjects));
  const updateCurriculum = (next: { boards?: string[]; classes?: string[]; subjects?: string[] }) => {
    const boards = next.boards ?? selectedBoards;
    const classes = next.classes ?? selectedClasses;
    const subjects = next.subjects ?? selectedSubjects;
    const selections = boards.flatMap((board) => classes.flatMap((classLevel) => subjects.map((subject) => {
      const stage = curriculumCatalogue.boards.find((item) => item.id === board)?.classes.find((item) => item.label === classLevel)?.stage ?? null;
      return { board, classLevel, subject, stage } satisfies CurriculumSelection;
    })));
    updateDraft({ curriculumBoards: boards, curriculumClasses: classes, curriculumSubjects: subjects, curriculumSelections: selections.slice(0, 40) });
    if (selections[0]) setSpecialization(`${selections[0].board} ${selections[0].classLevel} ${selections[0].subject}`);
  };
  return (
    <>
      <TopBar title="Profile" left={back ? "‹" : undefined} onLeft={back} />
      <Title>{title}</Title>
      <View style={styles.profileProgressTrack}><View style={[styles.profileProgressFill, { backgroundColor: theme.text, width: "76%" }]} /></View>
      <Pressable style={styles.avatarEditor} onPress={pickAvatar}>
        <Avatar role={role} label={initials} uri={avatarUri} large />
        <Text style={[styles.pencil, { backgroundColor: theme.accentStrong }]}>✎</Text>
      </Pressable>
      <View style={styles.twoColumn}>
        <View style={styles.fieldColumn}>
          <FieldLabel>First name</FieldLabel>
          <Input value={draft.firstName} onChangeText={(value) => updateDraft({ firstName: value })} placeholder="First name" />
        </View>
        <View style={styles.fieldColumn}>
          <FieldLabel>Last name</FieldLabel>
          <Input value={draft.lastName} onChangeText={(value) => updateDraft({ lastName: value })} placeholder="Last name" />
        </View>
      </View>
      <FieldLabel>DOB</FieldLabel>
      <PickerField value={draft.dob || "Select DOB"} onPress={openDatePicker} />
      <FieldLabel>City</FieldLabel>
      <Input value={draft.city} onChangeText={(value) => updateDraft({ city: value })} placeholder="City" />
      <FieldLabel>Address of communication</FieldLabel>
      <TextInput multiline value={draft.communicationAddress} onChangeText={(value) => updateDraft({ communicationAddress: value })} placeholder="Address of communication" placeholderTextColor="#94A3B8" style={styles.textArea} />
      <FieldLabel>Alternate phone number</FieldLabel>
      <Input value={draft.alternatePhone} onChangeText={(value) => updateDraft({ alternatePhone: value.replace(/\D/g, "").slice(0, 10) })} placeholder="Alternate phone number" keyboardType="phone-pad" />
      {role !== "parent" && (
        <>
          <FieldLabel>Stream</FieldLabel>
          <DropdownField
            value={streamLabel}
            options={streamOptions.map((item) => item.label)}
            onSelect={(label) => {
              const next = streamOptions.find((item) => item.label === label)?.value ?? "senior";
              setStream(next);
            }}
          />
          <FieldLabel>Specialization</FieldLabel>
          <DropdownField
            value={specialization}
            options={specializationOptions[stream]}
            onSelect={setSpecialization}
          />
          <FieldLabel>Board</FieldLabel>
          <MultiSelectField value={selectedBoards} options={boardOptions} onChange={(values) => updateCurriculum({ boards: values })} placeholder="Select boards" />
          <FieldLabel>Class / grade</FieldLabel>
          <MultiSelectField value={selectedClasses} options={classOptions} onChange={(values) => updateCurriculum({ classes: values })} placeholder="Select classes" />
          <FieldLabel>Subjects</FieldLabel>
          <MultiSelectField value={selectedSubjects} options={subjectOptions} onChange={(values) => updateCurriculum({ subjects: values })} placeholder="Select subjects" />
        </>
      )}
      <Button role={role} label={cta} onPress={onSubmit} loading={loading} disabled={disabled} />
    </>
  );
}

function DropdownField({ value, options, onSelect }: { value: string; options: string[]; onSelect: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <Pressable style={styles.dropdownField} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.dropdownText}>{value}</Text>
        <Text style={styles.dropdownCaret}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.dropdownList}>
          {options.map((option) => (
            <Pressable
              key={option}
              style={({ pressed }) => [styles.dropdownOption, option === value && styles.dropdownOptionSelected, pressed && styles.pressed]}
              onPress={() => {
                onSelect(option);
                setExpanded(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function MultiSelectField({ value, options, onChange, placeholder }: { value: string[]; options: string[]; onChange: (value: string[]) => void; placeholder: string }) {
  const [expanded, setExpanded] = useState(false);
  const cleanOptions = dedupe(options).filter(Boolean);
  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };
  return (
    <View style={styles.dropdownWrap}>
      <Pressable style={styles.dropdownField} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.dropdownText}>{value.length ? value.join(", ") : placeholder}</Text>
        <Text style={styles.dropdownCaret}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>
      {value.length ? (
        <View style={styles.multiSelectChips}>
          {value.map((item) => (
            <Pressable key={item} style={styles.multiSelectChip} onPress={() => toggle(item)}>
              <Text style={styles.multiSelectChipText}>{item} ×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {expanded && (
        <View style={styles.dropdownList}>
          {cleanOptions.map((option) => {
            const selected = value.includes(option);
            return (
              <Pressable key={option} style={({ pressed }) => [styles.dropdownOption, selected && styles.dropdownOptionSelected, pressed && styles.pressed]} onPress={() => toggle(option)}>
                <Text style={styles.dropdownOptionText}>{selected ? "✓ " : ""}{option}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PickerField({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.dropdownField} onPress={onPress}>
      <Text style={styles.dropdownText}>{value}</Text>
      <Text style={styles.dropdownCaret}>▣</Text>
    </Pressable>
  );
}

function TrackCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const title = role === "student" ? "Find your next tutor" : role === "tutor" ? "Review today’s leads" : "Track Apoorv's next class";
  const copy = role === "student" ? "Tutor matches, trial slots, and notes are ready." : role === "tutor" ? "New requests, trial follow-ups, and payout notes are ready." : "Attendance, payment, and tutor notes are ready.";
  return (
    <View style={[styles.trackCard, { backgroundColor: theme.cardAlt, borderColor: theme.accent }]}>
      <View style={styles.flex}>
        <Text style={styles.trackTitle}>{title}</Text>
        <Text style={styles.trackCopy}>{copy}</Text>
      </View>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.trackButton, pressed && styles.pressed]}>
        <LinearGradient colors={buttonGradient(role)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.trackButtonGradient}>
          <Text style={[styles.trackButtonText, { color: role === "tutor" ? "#201A00" : "#FFFFFF" }]}>{role === "student" ? "Search" : "Open"}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function NotificationStrip({ role, notifications, onRead }: { role: Role; notifications: NotificationSummary[]; onRead: (id: string) => void }) {
  const theme = useRoleTheme(role);
  const visible = notifications.filter((item) => !item.readAt).slice(0, 3);
  if (!visible.length) return null;
  return (
    <View style={[styles.notificationCard, { backgroundColor: theme.card }]}>
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>Updates</Text>
        <Text style={[styles.notificationCount, { color: theme.text }]}>{visible.length}</Text>
      </View>
      {visible.map((item) => (
        <Pressable key={item.id} style={({ pressed }) => [styles.notificationRow, pressed && styles.pressed]} onPress={() => onRead(item.id)}>
          <View style={[styles.notificationDot, { backgroundColor: theme.accentStrong }]} />
          <View style={styles.flex}>
            <Text style={styles.notificationRowTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.body}</Text>
          </View>
          <Text style={[styles.notificationAction, { color: theme.text }]}>Mark read</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MarketplaceHomeSection({ data, onOpen }: { data: MarketplaceRecommendationResponse; onOpen: (target: MarketplaceTarget) => void }) {
  const items = [
    ...data.tutors.slice(0, 3).map((tutor) => ({
      id: "tutor-" + tutor.id,
      tutorProfileId: tutor.tutorProfileId,
      kind: "tutor" as const,
      itemId: tutor.tutorProfileId,
      eyebrow: "Tutor match",
      title: tutor.name,
      meta: `${tutor.subjects.slice(0, 2).join(", ") || "Tutor"} • ${tutor.rating.toFixed(1)} ★`,
      copy: tutor.location || tutor.headline,
      initials: tutor.initials
    })),
    ...data.programs.slice(0, 3).map((program) => ({
      id: "program-" + program.id,
      tutorProfileId: program.tutor.tutorProfileId,
      kind: "program" as const,
      itemId: program.id,
      eyebrow: program.feeType === "paid" ? `Program • ₹${program.feeAmount ?? 0}` : "Free program",
      title: program.title,
      meta: `${program.milestoneCount} milestones • ${program.tutor.name}`,
      copy: program.fitReasons.join(" • "),
      initials: program.tutor.initials
    })),
    ...data.batches.slice(0, 2).map((batch) => ({
      id: "batch-" + batch.id,
      tutorProfileId: batch.tutor.tutorProfileId,
      kind: "batch" as const,
      itemId: batch.id,
      eyebrow: batch.availabilityStatus === "filling_fast" ? "Filling fast" : "Batch open",
      title: batch.title,
      meta: `${batch.schedule} • ${batch.tutor.name}`,
      copy: `${batch.fillPercent}% filled • ${batch.mode}`,
      initials: batch.tutor.initials
    }))
  ].slice(0, 6);
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>Recommended tutors and programs</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.carousel}>
        {items.map((item) => (
          <Pressable key={item.id} style={({ pressed }) => [styles.marketplaceCard, pressed && styles.pressed]} onPress={() => onOpen({ tutorProfileId: item.tutorProfileId, kind: item.kind, itemId: item.itemId })}>
            <View style={styles.marketplaceAvatar}>
              <Text style={styles.marketplaceAvatarText}>{item.initials}</Text>
            </View>
            <Text style={styles.marketplaceEyebrow}>{item.eyebrow}</Text>
            <Text style={styles.marketplaceTitle}>{item.title}</Text>
            <Text style={styles.marketplaceMeta}>{item.meta}</Text>
            <Text style={styles.marketplaceCopy}>{item.copy}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function RecommendationTile({ role, item, onPress }: { role: Role; item: Recommendation; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const glyph = item.type === "video" ? "▶" : item.type === "article" ? "₹" : "P";
  return (
    <Pressable onPress={onPress} style={[styles.recCard, { backgroundColor: roleCarouselCardBg[role] }]}>
      <View style={[styles.thumb, { backgroundColor: theme.surface, overflow: "hidden" }]}>
        <SvgAsset
          pathValue={assetPathFor(item.type, item.assetUrls)}
          fallback={<Text style={[styles.thumbText, { color: theme.text }]}>{glyph}</Text>}
        />
      </View>
      <View style={styles.recBody}>
        <View style={[styles.recBadge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.recBadgeText, { color: theme.text }]}>{item.thumbnailLabel}</Text>
        </View>
        <Text style={styles.recTitle}>{item.title}</Text>
        <Text style={styles.recMeta}>{item.description}</Text>
      </View>
    </Pressable>
  );
}


function buildJourneyActivities(role: Role, milestones: ProgramMilestone[]): JourneyActivity[] {
  return milestones
    .flatMap((milestone) => {
      const activities = milestone.activities ?? [];
      const requiredLimit = Math.min(5, activities.length);
      return activities.map((activity) => ({
        id: activity.resourceId,
        role,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        thumbnailLabel: activityTypeLabel(activity.type),
        assetUrls: activity.assetUrls,
        milestoneId: milestone.id,
        activityId: activity.id,
        activitySequence: activity.sequence,
        milestoneSequence: milestone.sequence,
        milestoneTitle: milestone.title,
        required: activity.sequence <= requiredLimit,
        status: activity.status
      }));
    })
    .sort((a, b) => a.milestoneSequence - b.milestoneSequence || a.activitySequence - b.activitySequence);
}

function activityTypeLabel(type: string) {
  if (type === "questionnaire") return "Assessment";
  if (type === "article") return "Article Education material";
  if (type === "video") return "Video Education material";
  if (type === "flashcard") return "Flashcards Education material";
  if (type === "quiz") return "Quiz Education material";
  if (type === "survey") return "Feedback survey";
  if (type === "todo") return "Task/activities";
  return capitalize(type);
}

function activityGlyph(type: string) {
  if (type === "video") return "▶";
  if (type === "article") return "A";
  if (type === "flashcard") return "▤";
  if (type === "quiz") return "?";
  if (type === "survey") return "S";
  if (type === "todo") return "✓";
  return "P";
}

function ProgramJourneyCard({ role, milestones, completedMilestone, onPress }: { role: Role; milestones: ProgramMilestone[]; completedMilestone: number; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const available = milestones.filter((milestone) => !milestone.locked).length;
  const completed = milestones.filter((milestone) => (milestone.activities ?? []).length > 0 && (milestone.activities ?? []).every((activity) => activity.status === "complete")).length || completedMilestone;
  const inProgress = milestones.filter((milestone) => {
    const activities = milestone.activities ?? [];
    const done = activities.filter((activity) => activity.status === "complete").length;
    return done > 0 && done < activities.length;
  }).length;
  const current = milestones.find((milestone) => !milestone.locked && (milestone.activities ?? []).some((activity) => activity.status !== "complete")) ?? milestones[0];
  const currentIndex = current ? milestones.findIndex((milestone) => milestone.id === current.id) : 0;
  return (
    <Pressable style={({ pressed }) => [styles.programJourneyCard, { backgroundColor: theme.card }, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.programJourneyTop}>
        <View style={styles.flex}>
          <Text style={styles.programJourneyTitle}>Program journey</Text>
          <Text style={styles.programJourneyCopy}>{current ? "Current topic: " + current.title : "Select a program to begin."}</Text>
        </View>
        <Text style={[styles.programJourneyAction, { color: theme.text }]}>Open</Text>
      </View>
      <View style={styles.programTracker}>
        {milestones.slice(0, 8).map((milestone, index) => {
          const activities = milestone.activities ?? [];
          const complete = activities.length > 0 && activities.every((activity) => activity.status === "complete");
          const active = index === currentIndex;
          return <View key={milestone.id} style={[styles.programTrackerDot, complete && { backgroundColor: "#16A34A", borderColor: "#16A34A" }, active && { backgroundColor: theme.accentStrong, borderColor: theme.accentStrong, transform: [{ scale: 1.25 }] }]} />;
        })}
      </View>
      <View style={styles.programStatsRow}>
        <ProgramStat value={String(available)} label="Available" />
        <ProgramStat value={String(inProgress)} label="In progress" />
        <ProgramStat value={String(completed)} label="Completed" />
      </View>
    </Pressable>
  );
}

function ProgramStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.programStat}>
      <Text style={styles.programStatValue}>{value}</Text>
      <Text style={styles.programStatLabel}>{label}</Text>
    </View>
  );
}

function ProgramCompletedCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable style={({ pressed }) => [styles.programCompletedCard, { backgroundColor: theme.card }, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.programCompletedIcon}>✓</Text>
      <Text style={styles.programCompletedTitle}>Program complete</Text>
      <Text style={styles.programCompletedCopy}>Congratulations. You have completed every topic in this program.</Text>
      <Text style={[styles.programJourneyAction, { color: theme.text }]}>Review journey</Text>
    </Pressable>
  );
}

function JourneyResourceCarousel({ title, role, items, emptyCopy, onPress }: { title: string; role: Role; items: JourneyActivity[]; emptyCopy: string; onPress: (item: SelectedActivity) => void }) {
  const theme = useRoleTheme(role);
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.carousel}>
          {items.map((item) => <JourneyResourceTile key={(item.milestoneId ?? "") + "-" + (item.activityId ?? "")} role={role} item={item} onPress={() => onPress(item)} />)}
        </ScrollView>
      ) : (
        <View style={[styles.emptyInlineCard, { backgroundColor: theme.cardSoft }]}>
          <Text style={styles.todayTitle}>All caught up</Text>
          <Text style={styles.todayMeta}>{emptyCopy}</Text>
        </View>
      )}
    </>
  );
}

function JourneyResourceTile({ role, item, onPress }: { role: Role; item: JourneyActivity; onPress: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.journeyResourceCard, { backgroundColor: roleCarouselCardBg[role] }, pressed && styles.pressed]}>
      <View style={[styles.journeyResourceImage, { backgroundColor: theme.surface, overflow: "hidden" }]}>
        <SvgAsset
          pathValue={assetPathFor(item.type, item.assetUrls)}
          fallback={<Text style={[styles.journeyResourceGlyph, { color: theme.text }]}>{activityGlyph(item.type)}</Text>}
        />
      </View>
      <Text style={styles.journeyResourceTopic}>{item.milestoneSequence}. {item.milestoneTitle}</Text>
      <Text style={styles.journeyResourceTitle}>{item.title}</Text>
      <Text style={styles.journeyResourceType}>{activityTypeLabel(item.type)}</Text>
    </Pressable>
  );
}

function TodayCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const title = role === "student" ? "Trial with Neha Verma" : role === "tutor" ? "Demo with Apoorv Gulati" : "Trial with Neha Verma";
  const meta = role === "tutor" ? "Tomorrow, 6:00 PM • Online" : "Tomorrow, 6:00 PM • Online";
  return (
    <Pressable style={[styles.todayCard, { backgroundColor: theme.card }]} onPress={onPress}>
      <View style={styles.flex}>
        <Text style={styles.todayTitle}>{title}</Text>
        <Text style={styles.todayMeta}>{meta}</Text>
      </View>
      <View style={[styles.todayBadge, { backgroundColor: theme.surface }]}>
        <Text style={[styles.todayBadgeText, { color: theme.text }]}>Pending</Text>
      </View>
    </Pressable>
  );
}

function TopBar({ title, left, right, onLeft, onRight }: { title: string; left?: string; right?: string; onLeft?: () => void; onRight?: () => void }) {
  return (
    <View style={styles.topbar}>
      {left ? (
        <Pressable onPress={onLeft} style={styles.topButton}><Text style={styles.topButtonText}>{left}</Text></Pressable>
      ) : (
        <View style={styles.topButtonSpacer} />
      )}
      <Text style={styles.topTitle}>{title}</Text>
      {right ? (
        <Pressable onPress={onRight} style={styles.topTextAction}><Text style={styles.topTextActionText}>{right}</Text></Pressable>
      ) : (
        <View style={styles.topButtonSpacer} />
      )}
    </View>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return <View style={styles.hero}>{children}</View>;
}

function Card({ children, role, onPress, selected }: { children: React.ReactNode; role: Role; onPress?: () => void; selected?: boolean }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.card }, selected && { borderColor: theme.accentStrong, backgroundColor: theme.surface }]}>
      {children}
    </Pressable>
  );
}

function Button({ role, label, onPress, disabled, loading, variant = "primary" }: { role: Role; label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "secondary" }) {
  const theme = useRoleTheme(role);
  const primary = variant === "primary";
  const inactive = disabled || loading;
  return (
    <Pressable disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.button, pressed && !inactive && styles.pressed, !primary && styles.secondaryButton, { borderColor: theme.accent, opacity: inactive ? 0.72 : 1 }]}>
      {primary ? (
        <LinearGradient colors={buttonGradient(role, inactive)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
          {loading ? <ActivityIndicator color={role === "tutor" ? "#201A00" : "#FFFFFF"} /> : <Text style={[styles.buttonText, { color: disabled ? "#8B95A1" : role === "tutor" ? "#201A00" : "#FFFFFF" }]}>{label}</Text>}
        </LinearGradient>
      ) : (
        loading ? <ActivityIndicator color={theme.text} /> : <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { compact?: boolean }) {
  return <TextInput {...props} placeholderTextColor="#94A3B8" style={[styles.input, props.compact && styles.compactInput]} />;
}

function Avatar({ role, label, uri, large }: { role: Role; label: string; uri?: string | null; large?: boolean }) {
  const theme = useRoleTheme(role);
  return (
    <View style={[styles.avatar, large && styles.avatarLarge, { backgroundColor: theme.accent }]}>
      {uri ? <Image source={{ uri }} style={[styles.avatarImage, large && styles.avatarImageLarge]} /> : <Text style={[styles.avatarText, { color: theme.text }]}>{label}</Text>}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

function Metric({ role, label, value, onPress }: { role: Role; label: string; value: string; onPress: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.metric, { backgroundColor: theme.cardAlt }, pressed && styles.pressed]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Muted>{label}</Muted>
    </Pressable>
  );
}

function DashboardGrid({ role, cards, setScreen }: { role: Role; cards: DashboardCard[] | null; setScreen: (screen: AppScreen) => void }) {
  const metrics: Record<Role, Array<{ value: string; label: string; target: AppScreen }>> = {
    student: [
      { value: "0", label: "Program", target: "sessions" },
      { value: "0", label: "Completed", target: "sessions" },
      { value: "0", label: "Smart picks", target: "home" },
      { value: "0", label: "Reminders", target: "events" }
    ],
    tutor: [
      { value: "0", label: "Students", target: "roleHub" },
      { value: "0", label: "Leads", target: "search" },
      { value: "0", label: "Rating", target: "ratings" },
      { value: "0", label: "Reminders", target: "events" }
    ],
    parent: [
      { value: "0", label: "Surveys", target: "roleHub" },
      { value: "0%", label: "Progress", target: "sessions" },
      { value: "0", label: "Smart picks", target: "home" },
      { value: "0", label: "Reminders", target: "events" }
    ]
  };
  const visibleCards = cards?.length ? cards : metrics[role];
  return (
    <View style={styles.grid}>
      {visibleCards.map((item) => (
        <Metric key={item.label} role={role} value={item.value} label={item.label} onPress={() => setScreen(item.target)} />
      ))}
    </View>
  );
}

function ParentMonitoringPanel({ data, openProgram, openClasses }: { data: ParentMonitoringResponse | null; openProgram: () => void; openClasses: () => void }) {
  const theme = useRoleTheme("parent");
  if (!data) {
    return (
      <>
        <SectionTitle>Child monitoring</SectionTitle>
        <View style={styles.monitoringCard}>
          <ActivityIndicator color={theme.accentStrong} />
          <Muted>Loading child progress</Muted>
        </View>
      </>
    );
  }
  if (!data.children.length) {
    return (
      <>
        <SectionTitle>Child monitoring</SectionTitle>
        <View style={styles.monitoringCard}>
          <CardTitle>No linked child yet</CardTitle>
          <Muted>Use the activation code from the student account to connect this parent profile.</Muted>
        </View>
      </>
    );
  }
  return (
    <>
      <SectionTitle>Child monitoring</SectionTitle>
      {data.children.map((child) => {
        const primaryProgram = child.progress[0];
        const latestQuiz = child.latestQuiz[0];
        return (
          <View key={child.profileId} style={styles.monitoringCard}>
            <View style={styles.monitoringHeaderRow}>
              <View>
                <Text style={styles.monitoringChildName}>{child.name}</Text>
                <Text style={styles.monitoringMeta}>{child.city ?? "City not added"}</Text>
              </View>
              <View style={[styles.monitoringScorePill, { backgroundColor: theme.accent }]}>
                <Text style={[styles.monitoringScoreText, { color: theme.text }]}>{primaryProgram?.percent ?? 0}%</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.monitoringProgressBox, pressed && styles.pressed]} onPress={openProgram}>
              <View style={styles.monitoringHeaderRow}>
                <Text style={styles.learnerProgressTitle}>{primaryProgram?.title ?? "No active program"}</Text>
                <Text style={styles.learnerProgressPercent}>{primaryProgram ? `${primaryProgram.completedActivities}/${primaryProgram.totalActivities}` : "0/0"}</Text>
              </View>
              <View style={styles.learnerProgressTrack}>
                <View style={[styles.learnerProgressFill, { width: `${primaryProgram?.percent ?? 0}%`, backgroundColor: theme.accentStrong }]} />
              </View>
              <Text style={styles.monitoringMeta}>Tap to view read-only program journey</Text>
            </Pressable>

            <View style={styles.monitoringSummaryGrid}>
              <View style={styles.monitoringMiniBox}>
                <Text style={styles.monitoringMiniValue}>{child.weeklySummary.completedActivities}</Text>
                <Text style={styles.monitoringMiniLabel}>Done this week</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.monitoringMiniBox, pressed && styles.pressed]} onPress={openClasses}>
                <Text style={styles.monitoringMiniValue}>{child.weeklySummary.activeClasses}</Text>
                <Text style={styles.monitoringMiniLabel}>Classes</Text>
              </Pressable>
              <View style={styles.monitoringMiniBox}>
                <Text style={styles.monitoringMiniValue}>{child.weeklySummary.averageQuizPercent !== null ? `${child.weeklySummary.averageQuizPercent}%` : "--"}</Text>
                <Text style={styles.monitoringMiniLabel}>Quiz avg.</Text>
              </View>
            </View>

            {latestQuiz ? (
              <View style={styles.monitoringInfoRow}>
                <Text style={styles.monitoringInfoTitle}>Latest quiz</Text>
                <Text style={styles.monitoringInfoMeta}>{latestQuiz.title} • {latestQuiz.score}/{latestQuiz.total} • {latestQuiz.percent}%</Text>
              </View>
            ) : null}

            {child.classes.slice(0, 2).map((item) => (
              <Pressable key={item.id} style={({ pressed }) => [styles.monitoringInfoRow, pressed && styles.pressed]} onPress={openClasses}>
                <Text style={styles.monitoringInfoTitle}>{item.title}</Text>
                <Text style={styles.monitoringInfoMeta}>{item.schedule} • {item.tutorName}</Text>
              </Pressable>
            ))}

            {child.alerts.length ? (
              <View style={styles.monitoringAlertStack}>
                {child.alerts.map((alert) => (
                  <View key={alert.id} style={styles.monitoringAlert}>
                    <Text style={styles.monitoringAlertTitle}>{alert.title}</Text>
                    <Text style={styles.monitoringAlertCopy}>{alert.copy}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.monitoringPlaceholderRow}>
              <Text style={styles.monitoringPlaceholder}>{child.placeholders.attendance}</Text>
              <Text style={styles.monitoringPlaceholder}>{child.placeholders.tutorNotes}</Text>
              <Text style={styles.monitoringPlaceholder}>{child.placeholders.paymentStatus}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

function ReminderComposer({
  role,
  title,
  date,
  time,
  setTitle,
  setDate,
  setTime,
  openDatePicker,
  openTimePicker,
  onCreate,
  loading
}: {
  role: Role;
  title: string;
  date: string;
  time: string;
  setTitle: (value: string) => void;
  setDate: (value: string) => void;
  setTime: (value: string) => void;
  openDatePicker: () => void;
  openTimePicker: () => void;
  onCreate: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.reminderCard}>
      <Text style={styles.reminderLabel}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Math revision reminder"
        placeholderTextColor="#94A3B8"
        style={styles.reminderTitleInput}
      />
      <View style={styles.reminderGrid}>
        <View style={styles.reminderField}>
          <Text style={styles.reminderLabel}>Date</Text>
          <Pressable style={styles.reminderInputShell} onPress={openDatePicker}>
            <Text style={styles.reminderInlineText}>{date}</Text>
            <Text style={styles.reminderAdornment}>▣</Text>
          </Pressable>
        </View>
        <View style={styles.reminderField}>
          <Text style={styles.reminderLabel}>Time</Text>
          <Pressable style={styles.reminderInputShell} onPress={openTimePicker}>
            <Text style={styles.reminderInlineText}>{time}</Text>
            <Text style={styles.reminderAdornment}>◷</Text>
          </Pressable>
        </View>
      </View>
      <Pressable disabled={loading} onPress={onCreate} style={({ pressed }) => [styles.reminderButton, pressed && !loading && styles.pressed, loading && { opacity: 0.72 }]}>
        <LinearGradient colors={buttonGradient(role)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.reminderButtonGradient}>
          {loading ? <ActivityIndicator color={role === "tutor" ? "#231F00" : "#FFFFFF"} /> : <Text style={[styles.reminderButtonText, { color: role === "tutor" ? "#231F00" : "#FFFFFF" }]}>Create reminder</Text>}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function ReminderPreviewCard({ role, reminders }: { role: Role; reminders: Reminder[] }) {
  const theme = useRoleTheme(role);
  return (
    <View style={[styles.reminderPreviewCard, { backgroundColor: theme.card }]}>
      {reminders.map((reminder, index) => (
        <View key={reminder.id} style={[styles.reminderPreviewRow, index < reminders.length - 1 && styles.reminderPreviewDivider]}>
          <View style={styles.flex}>
            <Text style={styles.reminderSummaryTitle}>{reminder.title}</Text>
            <Text style={styles.reminderSummaryMeta}>{formatReminderDateTime(reminder.startsAt)}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.roleBadgeText, { color: theme.text }]}>{capitalize(role)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SwipeReminderRow({ role, reminder, connectedPeople, onEdit, onDelete }: { role: Role; reminder: Reminder; connectedPeople?: string; onEdit: () => void; onDelete: () => void }) {
  const theme = useRoleTheme(role);
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const actionWidth = 112;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(-actionWidth, Math.min(0, currentX.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = currentX.current + gesture.dx < -48 ? -actionWidth : 0;
        currentX.current = next;
        Animated.spring(translateX, { toValue: next, useNativeDriver: true }).start();
      }
    })
  ).current;

  function closeRow() {
    currentX.current = 0;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }

  return (
    <View style={styles.swipeReminderShell}>
      <View style={styles.swipeActions}>
        <Pressable style={({ pressed }) => [styles.swipeActionButton, { backgroundColor: theme.surface }, pressed && styles.pressed]} onPress={() => { closeRow(); onEdit(); }}>
          <Text style={[styles.swipeActionIcon, { color: theme.text }]}>✎</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.swipeActionButton, styles.swipeDeleteButton, pressed && styles.pressed]} onPress={() => { closeRow(); onDelete(); }}>
          <Text style={styles.swipeDeleteIcon}>⌫</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.swipeReminderCard, { backgroundColor: theme.card, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <View style={styles.flex}>
          <Text style={styles.reminderSummaryTitle}>{reminder.title}</Text>
          <Text style={styles.reminderSummaryMeta}>{formatReminderDateTime(reminder.startsAt)}</Text>
          {connectedPeople ? <Text style={styles.reminderSummaryMeta}>{connectedPeople}</Text> : null}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.roleBadgeText, { color: theme.text }]}>{capitalize(role)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function formatReminderDateTime(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)$/);
  if (!match) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
  }
  const [, day, month, year, time] = match;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1] ?? month;
  return `${Number(day)} ${monthName} ${year} • ${time.toLowerCase()}`;
}

function resourceArticleText(resource: ResourceDetailPayload | SelectedActivity) {
  const detail = resource as ResourceDetailPayload;
  const contentJson = detail.contentJson;
  if (typeof detail.body === "string" && detail.body.trim()) return detail.body;
  if (contentJson && typeof contentJson.articleText === "string") return contentJson.articleText;
  if (contentJson && Array.isArray(contentJson.transcriptSummary)) return contentJson.transcriptSummary.map((item) => `• ${item}`).join("\n");
  return "Review the concept, note the keywords, and connect this activity with the milestone goal. Use the examples to prepare for board-style answers and quick recall.";
}

function resourceMetaLine(resource: ResourceDetailPayload | SelectedActivity) {
  const detail = resource as ResourceDetailPayload;
  const contentJson = detail.contentJson;
  if (resource.type === "video" && contentJson && typeof contentJson.durationSeconds === "number") {
    return `${Math.ceil(contentJson.durationSeconds / 60)} min video${detail.vttPath ? " • captions available" : ""}`;
  }
  if (resource.type === "article" && contentJson && typeof contentJson.readingMinutes === "number") {
    return `${contentJson.readingMinutes} min read`;
  }
  return capitalize(resource.type);
}

function resourceMediaUrl(resource: ResourceDetailPayload | SelectedActivity) {
  const detail = resource as ResourceDetailPayload;
  const contentJson = detail.contentJson;
  if (detail.assetUrls?.media) return detail.assetUrls.media;
  if (contentJson && typeof contentJson.mediaUrl === "string") return contentJson.mediaUrl;
  return "";
}

function assetPathFor(type: string, assetUrls?: { thumbnail?: string | null; banner?: string | null }, kind: "thumbnail" | "banner" = "thumbnail") {
  return assetUrls?.[kind] ?? defaultAssetPathsByType[type]?.[kind] ?? null;
}

function amsFileUrl(pathValue?: string | null) {
  if (!pathValue) return "";
  if (/^https?:\/\//.test(pathValue)) return pathValue;
  return `${appConfig.apiBaseUrl}${pathValue}`;
}

function parseTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":").map(Number);
  if (parts.some((item) => Number.isNaN(item))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function parseVtt(value: string): VttCue[] {
  return value
    .replace(/\r/g, "")
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("WEBVTT"))
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      const timingLine = lines.find((line) => line.includes("-->"));
      if (!timingLine) return null;
      const [startRaw, endRaw] = timingLine.split("-->").map((item) => item.trim().split(/\s+/)[0]);
      const text = lines.slice(lines.indexOf(timingLine) + 1).join(" ").trim();
      return { start: parseTimestamp(startRaw), end: parseTimestamp(endRaw), text };
    })
    .filter((cue): cue is VttCue => Boolean(cue?.text));
}

function SvgAsset({ pathValue, fallback }: { pathValue?: string | null; fallback: ReactNode }) {
  const [xml, setXml] = useState("");
  useEffect(() => {
    const url = amsFileUrl(pathValue);
    if (!url) {
      setXml("");
      return undefined;
    }
    let active = true;
    fetch(url)
      .then((response) => response.ok ? response.text() : "")
      .then((value) => {
        if (active) setXml(value.trim().startsWith("<svg") ? value : "");
      })
      .catch(() => {
        if (active) setXml("");
      });
    return () => {
      active = false;
    };
  }, [pathValue]);

  if (!xml) return <>{fallback}</>;
  return <SvgXml xml={xml} width="100%" height="100%" />;
}

function VideoResourcePlayer({ resource }: { resource: ResourceDetailPayload | SelectedActivity }) {
  const detail = resource as ResourceDetailPayload;
  const mediaUrl = resourceMediaUrl(resource);
  const [cues, setCues] = useState<VttCue[]>([]);
  const [activeCaption, setActiveCaption] = useState("");
  const player = useVideoPlayer(mediaUrl ? { uri: mediaUrl } : null, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    const vttUrl = amsFileUrl(detail.assetUrls?.vtt);
    if (!vttUrl) {
      setCues([]);
      setActiveCaption("");
      return undefined;
    }
    let active = true;
    fetch(vttUrl)
      .then((response) => response.ok ? response.text() : "")
      .then((value) => {
        if (active) setCues(parseVtt(value));
      })
      .catch(() => {
        if (active) setCues([]);
      });
    return () => {
      active = false;
    };
  }, [detail.assetUrls?.vtt]);

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const cue = cues.find((item) => currentTime >= item.start && currentTime <= item.end);
    setActiveCaption(cue?.text ?? "");
  });

  if (!mediaUrl) {
    return (
      <View style={styles.videoUnavailable}>
        <Text style={styles.videoUnavailableTitle}>Video is being prepared</Text>
        <Text style={styles.videoUnavailableCopy}>The banner, transcript, and captions are available now. Add a media file URL in AMS to enable playback.</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoPlayerShell}>
      <VideoView
        player={player}
        nativeControls
        allowsFullscreen
        contentFit="contain"
        style={styles.videoView}
      />
      {activeCaption ? (
        <View style={styles.subtitleOverlay}>
          <Text style={styles.subtitleText}>{activeCaption}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ResourceDetail({ role, resource, complete, loading, back, completedTopic, continueActivity, nextMilestone, backToProgram, backToHome }: { role: Role; resource: ResourceDetailPayload | SelectedActivity; complete: () => void; loading?: boolean; back: () => void; completedTopic: null | { nextActivity?: SelectedActivity; nextMilestoneActivity?: SelectedActivity; milestoneComplete: boolean; programComplete?: boolean }; continueActivity: () => void; nextMilestone: () => void; backToProgram: () => void; backToHome: () => void }) {
  const theme = useRoleTheme(role);
  const cta = resource.type === "article" ? "Mark as read" : resource.type === "video" ? "Mark watched" : "Mark complete";
  const detail = resource as ResourceDetailPayload;
  const visualPath = assetPathFor(resource.type, detail.assetUrls, "banner") ?? assetPathFor(resource.type, detail.assetUrls);
  const readOnly = role === "parent" || role === "tutor";
  return (
    <>
      <TopBar title={resource.thumbnailLabel.toUpperCase()} left="‹" onLeft={back} />
      <View style={styles.resourceBanner}>
        <SvgAsset
          pathValue={visualPath}
          fallback={<Text style={[styles.playerIcon, { color: resource.type === "video" ? "#FFFFFF" : theme.text }]}>{resource.type === "video" ? "▶" : "A"}</Text>}
        />
      </View>
      <View style={styles.reactionRow}>
        <Text style={styles.reactionButton}>👍 {role === "tutor" ? "0" : ""}</Text>
        <Text style={styles.reactionButton}>👎 {role === "tutor" ? "0" : ""}</Text>
      </View>
      <Text style={styles.resourceTitle}>{resource.title}</Text>
      <Text style={styles.resourceSubtitle}>{resource.description}</Text>
      <Text style={styles.assetMetaText}>{resourceMetaLine(resource)}</Text>
      {resource.type === "video" ? <VideoResourcePlayer resource={resource} /> : null}
      <Text style={styles.articleBody}>{resourceArticleText(resource)}</Text>
      {!readOnly ? <View style={styles.resourceBottomCta}><Button role={role} label={cta} onPress={complete} loading={loading} /></View> : null}
      {completedTopic ? (
        <View style={styles.topicTrayBackdrop}>
          <View style={styles.topicTray}>
            <View style={styles.trayHandle} />
            <View style={styles.trophyCircle}><Text style={styles.trophyIcon}>🏆</Text></View>
            <Text style={styles.topicCompleteTitle}>Topic complete</Text>
            <Text style={styles.topicCompleteCopy}>{completedTopic.programComplete ? "You have completed every milestone in this program." : completedTopic.milestoneComplete ? "Great job finishing this milestone. The next unlocked milestone is ready." : "Great job finishing this activity. Continue with the next topic when you are ready."}</Text>
            <View style={styles.topicActionRow}>
              {completedTopic.programComplete ? <Button role={role} label="Back to Home" onPress={backToHome} /> : completedTopic.nextActivity ? <Button role={role} label="Continue" onPress={continueActivity} /> : completedTopic.nextMilestoneActivity ? <Button role={role} label="Next Milestone" onPress={nextMilestone} /> : null}
              <Button role={role} variant="secondary" label="Back to Program" onPress={backToProgram} />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

function FlashIntro({ role, resource, start, back }: { role: Role; resource: ResourceDetailPayload | SelectedActivity; start: () => void; back: () => void }) {
  const theme = useRoleTheme(role);
  const detail = resource as ResourceDetailPayload;
  const cards = detail.flashcards?.length ? detail.flashcards : fallbackFlashcards;
  const visualPath = assetPathFor(resource.type, detail.assetUrls, "banner") ?? assetPathFor(resource.type, detail.assetUrls);
  const title = /quadratic/i.test(resource.title) ? "Motion active recall cards" : resource.title;
  const description = /quadratic|quick revision/i.test(resource.description) ? "10 flashcards for one-dimensional motion definitions, units, and graphs." : resource.description;
  return (
    <>
      <TopBar title="FLASHCARDS" left="‹" onLeft={back} />
      <View style={styles.flashProgressTrack}><View style={[styles.flashProgressFill, { backgroundColor: theme.accentStrong, width: "18%" }]} /></View>
      <View style={styles.flashIntroLanding}>
        <View style={[styles.flashIntroBanner, { backgroundColor: theme.accent }]}>
          <SvgAsset
            pathValue={visualPath}
            fallback={<Text style={styles.flashIntroIcon}>▤</Text>}
          />
        </View>
        <Text style={styles.flashIntroTitle}>{title}</Text>
        <Text style={styles.flashIntroCopy}>{description}</Text>
        <Text style={styles.flashIntroMeta}>{cards.length} cards • Tap each card to reveal the answer</Text>
      </View>
      {role !== "parent" ? <View style={styles.resourceBottomCta}><Button role={role} label="Start flashcards" onPress={start} /></View> : null}
    </>
  );
}

function FlashPlay({ role, resource, cards, index, answer, setAnswer, next, learnMore, complete, back }: { role: Role; resource: ResourceDetailPayload | SelectedActivity; cards: FlashcardPayload[]; index: number; answer: boolean; setAnswer: (value: boolean) => void; next: () => void; learnMore: () => void; complete: () => void; back: () => void }) {
  const activeCard = cards[index] ?? cards[0] ?? fallbackFlashcards[0];
  const progressWidth = (String(Math.round(((index + 1) / cards.length) * 100)) + "%") as any;
  const isLastCard = index === cards.length - 1;
  return (
    <>
      <TopBar title="FLASHCARDS" left="‹" onLeft={back} />
      <View style={styles.flashProgressTrack}><View style={[styles.flashProgressFill, { width: progressWidth }]} /></View>
      <Text style={styles.quizCount}>{resource.title}</Text>
      <Pressable style={[styles.flashcard, answer && styles.flashcardAnswer]} onPress={() => setAnswer(!answer)}>
        <Text style={styles.flashCount}>{index + 1} of {cards.length}</Text>
        <Text style={styles.flashText}>{answer ? activeCard.answer : activeCard.question}</Text>
        <Text style={styles.flipHint}>Tap to flip</Text>
      </Pressable>
      {answer && activeCard.learnMore ? <View style={styles.quizLearnMore}><Text style={styles.quizLearnMoreText}>💡 {activeCard.learnMore}</Text></View> : null}
      {answer && activeCard.relatedArticleId ? <Button role={role} variant="secondary" label="💡  Learn more" onPress={learnMore} /> : null}
      {role === "tutor" && isLastCard ? null : <Button role={role} label={isLastCard && role !== "tutor" ? "Mark complete" : "Next"} onPress={isLastCard && role !== "tutor" ? complete : next} />}
    </>
  );
}

function QuizIntro({ role, resource, loading, start, back }: { role: Role; resource: ResourceDetailPayload | SelectedActivity; loading: boolean; start: () => void; back: () => void }) {
  const detail = resource as ResourceDetailPayload;
  const visualPath = assetPathFor(resource.type, detail.assetUrls, "banner") ?? assetPathFor(resource.type, detail.assetUrls);
  return (
    <>
      <TopBar title="QUIZ" left="‹" onLeft={back} />
      <View style={styles.quizLandingHero}>
        <View style={styles.quizHeroVisual}>
          <SvgAsset
            pathValue={visualPath}
            fallback={<Text style={styles.quizHeroBadge}>Quiz</Text>}
          />
        </View>
        <Text style={styles.quizHeroBadge}>Quiz</Text>
        <Text style={styles.quizHeroTitle}>{resource.title}</Text>
        <Text style={styles.quizHeroCopy}>{resource.description}</Text>
      </View>
      {role !== "parent" ? <View style={styles.resourceBottomCta}><Button role={role} label="Start" onPress={start} loading={loading} /></View> : null}
    </>
  );
}

function QuizPlay({ role, payload, index, answers, submitted, setAnswer, submit, next, back }: { role: Role; payload: QuizPayload; index: number; answers: number[][]; submitted: boolean[]; setAnswer: (answer: number[]) => void; submit: () => void; next: () => void; back: () => void }) {
  const theme = useRoleTheme(role);
  const question = payload.questions[index];
  const selected = answers[index] ?? [];
  const isMulti = question.questionType === "multi";
  const locked = role === "student" ? Boolean(submitted[index]) : selected.length > 0;
  const canSubmit = role === "student" && selected.length > 0 && !locked;
  const canGoNext = role === "student" ? locked : selected.length > 0;
  const correctIndexes = question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0];
  const progressWidth = (String(Math.round(((index + 1) / payload.questions.length) * 100)) + "%") as any;
  const updateSelection = (optionIndex: number) => {
    if (role === "student" && locked) return;
    if (isMulti) {
      setAnswer(selected.includes(optionIndex) ? selected.filter((item) => item !== optionIndex) : [...selected, optionIndex].sort((a, b) => a - b));
      return;
    }
    setAnswer([optionIndex]);
  };
  return (
    <>
      <TopBar title="QUIZ" left="‹" onLeft={back} />
      <View style={styles.flashProgressTrack}><View style={[styles.flashProgressFill, { backgroundColor: theme.accentStrong, width: progressWidth }]} /></View>
      <Text style={styles.quizCount}>{index + 1} of {payload.questions.length}</Text>
      <Text style={styles.quizPrompt}>{question.prompt}</Text>
      <View style={styles.quizOptions}>
        {question.options.map((option, optionIndex) => {
          const selectedOption = selected.includes(optionIndex);
          const correct = locked && correctIndexes.includes(optionIndex);
          const wrong = locked && selectedOption && !correctIndexes.includes(optionIndex);
          return (
            <Pressable key={`${option}-${optionIndex}`} disabled={role === "student" && locked} onPress={() => updateSelection(optionIndex)} style={({ pressed }) => [styles.quizOption, selectedOption && { borderColor: theme.accentStrong, backgroundColor: theme.accent }, correct && styles.quizOptionCorrect, wrong && styles.quizOptionWrong, pressed && !(role === "student" && locked) && styles.pressed]}>
              <Text style={styles.quizOptionText}>{option}</Text>
              {correct ? <Text style={styles.quizCorrect}>✓</Text> : wrong ? <Text style={styles.quizWrong}>×</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {locked ? <View style={styles.quizLearnMore}><Text style={styles.quizLearnMoreText}>💡 {question.learnMore}</Text></View> : null}
      <View style={styles.resourceBottomCta}>
        {role === "student" && !locked
          ? <Button role={role} label="Submit" onPress={submit} disabled={!canSubmit} />
          : <Button role={role} label={index === payload.questions.length - 1 ? "See score" : "Next"} onPress={next} disabled={!canGoNext} />}
      </View>
    </>
  );
}

function arraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function QuizResult({ role, payload, answers, complete, loading, backToTopic }: { role: Role; payload: QuizPayload; answers: number[][]; complete: () => void; loading?: boolean; backToTopic: () => void }) {
  const correct = payload.questions.reduce((total, question, index) => total + (arraysEqual((question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0]).slice().sort((a, b) => a - b), (answers[index] ?? []).slice().sort((a, b) => a - b)) ? 1 : 0), 0);
  const percent = payload.questions.length ? Math.round((correct / payload.questions.length) * 100) : 0;
  const result = percent === 100
    ? ["🏅", "Amazing work!", "You got every question right. Keep this momentum going."]
    : percent >= 75
      ? ["👍", "Excellent work!", "You are clearly mastering this material."]
      : percent >= 50
        ? ["⚙️", "Solid effort!", "Your knowledge is growing. Review the missed ideas once."]
        : percent > 0
          ? ["🎯", "Small win, big step.", "Every step forward counts. Revisit the notes and try again."]
          : ["🌱", "Don't worry, learning takes time.", "You got none correct. That just means there is more to learn moving forward."];
  return (
    <>
      <TopBar title="QUIZ" left="‹" onLeft={backToTopic} />
      <View style={styles.quizResultWrap}>
        <Text style={styles.quizResultIcon}>{result[0]}</Text>
        <Text style={styles.quizResultTitle}>{result[1]}</Text>
        <Text style={styles.quizResultCopy}>You got {correct} out of {payload.questions.length} correct. {result[2]}</Text>
        <Text style={styles.quizFeedbackTitle}>How did you like this content?</Text>
        <View style={styles.reactionRowCentered}><Text style={styles.reactionButton}>👍</Text><Text style={styles.reactionButton}>👎</Text></View>
      </View>
      <View style={styles.resourceBottomCta}>
        {role !== "tutor" ? <Button role={role} label="Next Milestone" onPress={complete} loading={loading} /> : null}
        <Pressable style={({ pressed }) => [styles.backToTopicLink, pressed && styles.pressed]} onPress={backToTopic}><Text style={styles.backToTopicText}>Back to program</Text></Pressable>
      </View>
    </>
  );
}

function MilestoneDetail({
  role,
  milestone,
  openActivity,
  back,
  editableActivities,
  onEditActivity
}: {
  role: Role;
  milestone: ProgramMilestone;
  openActivity: (activityId?: string) => void;
  back: () => void;
  editableActivities?: boolean;
  onEditActivity?: (activityId: string) => void;
}) {
  const theme = useRoleTheme(role);
  const activities = milestone.activities ?? [];
  const completed = activities.filter((activity) => activity.status === "complete").length;
  const progressWidth = (String(activities.length ? Math.round((completed / activities.length) * 100) : 0) + "%") as any;
  const required = activities.slice(0, Math.min(5, activities.length));
  const supporting = activities.slice(required.length);
  const nextActivity = activities.find((activity) => activity.status !== "complete") ?? activities[0];
  return (
    <>
      <TopBar title="" left="‹" onLeft={back} />
      <Text style={styles.milestoneDetailTitle}>{milestone.title}</Text>
      <Text style={styles.milestoneDetailCopy}>This topic covers the essentials and key tips to support you on your journey.</Text>
      <View style={styles.milestoneDetailTrack}><View style={[styles.milestoneDetailFill, { backgroundColor: theme.accentStrong, width: progressWidth }]} /></View>
      <Text style={styles.milestoneProgressText}>{completed} of {activities.length} complete</Text>
      <View style={styles.activitySectionHeader}>
        <Text style={styles.activitySectionTitle}>Getting started</Text>
        <View style={[styles.activityBadge, { backgroundColor: theme.accent }]}><Text style={[styles.activityBadgeText, { color: theme.text }]}>Required</Text></View>
      </View>
      {required.map((activity) => <ActivityRow key={activity.id} activity={activity} disabled={role === "parent"} onPress={() => openActivity(activity.id)} editable={editableActivities} onEdit={() => onEditActivity?.(activity.id)} />)}
      {supporting.length ? (
        <>
          <View style={styles.activitySectionHeader}>
            <Text style={styles.activitySectionTitle}>Supporting activities</Text>
            <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>Optional</Text></View>
          </View>
          {supporting.map((activity) => <ActivityRow key={activity.id} activity={activity} disabled={role === "parent"} onPress={() => openActivity(activity.id)} editable={editableActivities} onEdit={() => onEditActivity?.(activity.id)} />)}
        </>
      ) : null}
      {role !== "parent" && role !== "tutor" ? (
        <View style={styles.bottomCtaInline}>
          <Button role={role} label={completed > 0 ? "Continue" : "Let's get started"} onPress={() => openActivity(nextActivity?.id)} disabled={!nextActivity} />
        </View>
      ) : null}
    </>
  );
}

function ActivityRow({ activity, onPress, disabled, editable, onEdit }: { activity: NonNullable<ProgramMilestone["activities"]>[number]; onPress: () => void; disabled?: boolean; editable?: boolean; onEdit?: () => void }) {
  const palette = activity.type === "video" ? ["#FBE7FA", "▷"] : activity.type === "flashcard" ? ["#EAD8FF", "▤"] : activity.type === "quiz" ? ["#FFE8D8", "?"] : ["#E5F6FD", "▣"];
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.activityRow, activity.status === "complete" && styles.activityRowComplete, disabled && styles.activityRowDisabled, pressed && !disabled && styles.pressed]} onPress={onPress}>
      <View style={[styles.activityIconBox, { backgroundColor: palette[0], overflow: "hidden" }]}>
        <SvgAsset
          pathValue={assetPathFor(activity.type, activity.assetUrls)}
          fallback={<Text style={styles.activityIcon}>{palette[1]}</Text>}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityType}>{capitalize(activity.type)}</Text>
      </View>
      {activity.status === "complete" ? <View style={styles.activityCompleteTick}><Text style={styles.activityCompleteTickText}>✓</Text></View> : null}
      {editable ? (
        <Pressable style={({ pressed }) => [styles.activityEditButton, pressed && styles.pressed]} onPress={(event) => { event.stopPropagation(); onEdit?.(); }}>
          <Text style={styles.activityEditText}>Edit</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Sessions({
  role,
  programs,
  selectedPrograms,
  selectedProgramId,
  programDataReady,
  switchProgram,
  milestones,
  completedMilestone,
  openMilestone,
  menuOpen,
  setMenuOpen,
  openProgramPicker,
  archiveProgram,
  restoreProgram,
  archiveModalVisible,
  setArchiveModalVisible,
  publishProgram,
  tutorProgramDraft,
  setTutorProgramDraft,
  tutorProgramComposerOpen,
  setTutorProgramComposerOpen,
  createTutorProgram,
  createTutorProgramLoading,
  editingProgramId,
  setEditingProgramId,
  loadTutorProgramForEdit,
  loadingAction
}: {
  role: Role;
  programs: ProgramSummary[];
  selectedPrograms: ProgramSummary[];
  selectedProgramId: string | null;
  programDataReady: boolean;
  switchProgram: (programId: string) => void;
  milestones: ProgramMilestone[];
  completedMilestone: number;
  openMilestone: (milestone: ProgramMilestone) => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  openProgramPicker: () => void;
  archiveProgram: (programId?: string | null) => void;
  restoreProgram: (programId?: string | null) => void;
  archiveModalVisible: boolean;
  setArchiveModalVisible: (value: boolean) => void;
  publishProgram: (programId: string) => void;
  tutorProgramDraft: TutorProgramDraft;
  setTutorProgramDraft: (value: TutorProgramDraft | ((draft: TutorProgramDraft) => TutorProgramDraft)) => void;
  tutorProgramComposerOpen: boolean;
  setTutorProgramComposerOpen: (value: boolean) => void;
  createTutorProgram: () => void;
  createTutorProgramLoading: boolean;
  editingProgramId: string | null;
  setEditingProgramId: (value: string | null) => void;
  loadTutorProgramForEdit: (programId: string) => void;
  loadingAction: string | null;
}) {
  const theme = useRoleTheme(role);
  const activeTutorPrograms = role === "tutor" ? programs.filter((program) => !isArchivedProgram(program)) : programs;
  const archivedTutorPrograms = role === "tutor" ? programs.filter(isArchivedProgram) : [];
  const visiblePrograms = role === "tutor" ? activeTutorPrograms : programs;
  const selectedProgram = selectedPrograms.find((program) => program.id === selectedProgramId) ?? visiblePrograms.find((program) => program.id === selectedProgramId) ?? selectedPrograms[0] ?? visiblePrograms[0];
  const selectedProgramStatus = programStatusMeta(selectedProgram);
  const tutorEmptyState = role === "tutor" && programDataReady && activeTutorPrograms.length === 0 && !selectedProgram && !selectedProgramId && !tutorProgramComposerOpen;

  return (
    <>
      <View style={styles.milesHeader}>
        <View style={styles.milesHeaderSpacer} />
        <Text style={styles.milesHeaderTitle}>{role === "tutor" ? "Program" : "My Miles"}</Text>
        {role !== "parent" && !tutorEmptyState ? (
          <Pressable style={styles.headerIconButton} onPress={() => setMenuOpen(!menuOpen)}>
            <Text style={[styles.headerIconButtonText, { color: theme.accentStrong }]}>⋮</Text>
          </Pressable>
        ) : <View style={styles.milesHeaderSpacer} />}
        {menuOpen && role !== "parent" && !tutorEmptyState ? (
          <View style={styles.programMenu}>
            {role === "tutor" ? (
              <Pressable
                style={({ pressed }) => [styles.programMenuItem, pressed && styles.pressed]}
                onPress={openProgramPicker}
              >
                <Text style={styles.programMenuText}>Add a program</Text>
              </Pressable>
            ) : null}
            <Pressable style={({ pressed }) => [styles.programMenuItem, pressed && styles.pressed]} onPress={() => { setMenuOpen(false); setArchiveModalVisible(true); }}>
              <Text style={styles.programMenuText}>Archive a program</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {tutorEmptyState ? (
        <TutorProgramEmptyState
          role={role}
          onCreate={() => {
            setTutorProgramDraft(defaultTutorProgramDraft);
            setEditingProgramId(null);
            setTutorProgramComposerOpen(true);
          }}
        />
      ) : null}
      {(role === "student" || role === "parent") && selectedPrograms.length > 0 ? (
        <View style={[styles.selectedProgramPanel, { backgroundColor: theme.card }]}>
          <FieldLabel>Selected programs</FieldLabel>
          <DropdownField
            value={selectedProgram?.title ?? "Select program"}
            options={selectedPrograms.map((program) => program.title)}
            onSelect={(title) => {
              const program = selectedPrograms.find((item) => item.title === title);
              if (program) switchProgram(program.id);
            }}
          />
        </View>
      ) : null}
      {role === "tutor" && !tutorEmptyState ? (
        <TutorProgramAuthoring
          role={role}
          programs={programs}
          activePrograms={activeTutorPrograms}
          selectedProgram={selectedProgram}
          draft={tutorProgramDraft}
          setDraft={setTutorProgramDraft}
          open={tutorProgramComposerOpen}
          setOpen={setTutorProgramComposerOpen}
          createProgram={createTutorProgram}
          publishProgram={publishProgram}
          archiveProgram={archiveProgram}
          loading={createTutorProgramLoading}
          editingProgramId={editingProgramId}
          setEditingProgramId={setEditingProgramId}
          loadProgramForEdit={loadTutorProgramForEdit}
          loadingAction={loadingAction}
        />
      ) : null}
      {role === "tutor" && selectedProgram ? (
        <View style={styles.programStatusLine}>
          <Text style={[styles.programStatusPill, { color: theme.text }]}>{selectedProgramStatus.icon} {selectedProgramStatus.label}</Text>
        </View>
      ) : null}
      {!tutorEmptyState ? <View style={styles.milesTimeline}>
        {milestones.map((milestone, index) => {
          const locked = role === "tutor" ? false : milestone.sequence > completedMilestone + 1;
          const complete = milestone.sequence <= completedMilestone;
          const active = role === "tutor" ? index === 0 : milestone.sequence === completedMilestone + 1;
          const completeGreen = "#16A34A";
          const activityText = milestone.activities?.length
            ? milestone.activities.map((activity) => capitalize(activity.type)).join(" • ")
            : "Video • Article • Flashcard • Quiz";
          const completedActivities = milestone.activities?.filter((activity) => activity.status === "complete").length ?? (complete ? 4 : 0);
          const totalActivities = milestone.activities?.length ?? 4;
          const progress = complete ? 1 : totalActivities ? completedActivities / totalActivities : 0;
          const progressPercent = Math.round(progress * 100);
          const tutorMode = role === "tutor";
          const hasStarted = completedActivities > 0;
          const ctaLabel = locked ? "Coming soon" : role === "parent" ? "View progress" : role === "tutor" ? "Review" : complete ? "Review" : hasStarted ? "Continue" : "Start";
          const chipLabel = !complete && hasStarted ? "Keep learning" : null;

          return (
            <View key={milestone.id} style={styles.mileRow}>
              <View style={styles.mileRail}>
                {index > 0 ? <View style={[styles.mileRailLine, styles.mileRailLineTop, locked ? styles.mileRailLineLocked : { backgroundColor: milestone.sequence <= completedMilestone + 1 ? completeGreen : theme.accentStrong }]} /> : null}
                <View style={[
                  styles.mileNode,
                  locked ? styles.mileNodeLocked : { backgroundColor: complete ? completeGreen : theme.accent, borderColor: complete ? completeGreen : theme.accentStrong }
                ]}>
                  <Text style={[styles.mileNodeText, { color: locked ? "#9CA3AF" : complete ? "#FFFFFF" : theme.text }]}>{locked ? "⌕" : milestone.sequence}</Text>
                </View>
                {index < milestones.length - 1 ? <View style={[styles.mileRailLine, styles.mileRailLineBottom, locked ? styles.mileRailLineLocked : { backgroundColor: milestone.sequence <= completedMilestone ? completeGreen : theme.accentStrong }]} /> : null}
              </View>
              <Pressable
                disabled={locked}
                onPress={() => {
                  if (locked) return;
                  openMilestone(milestone);
                }}
                style={({ pressed }) => [
                  styles.mileCard,
                  active ? styles.mileCardActive : null,
                  locked ? styles.mileCardLocked : null,
                  pressed && !locked ? styles.pressed : null
                ]}
              >
                {chipLabel ? (
                  <View style={[styles.mileChip, { backgroundColor: "#CFE8F5" }]}>
                    <Text style={[styles.mileChipText, { color: theme.text }]}>{chipLabel}</Text>
                  </View>
                ) : null}
                <View style={tutorMode ? styles.mileCardTopRowTutor : styles.mileCardTopRow}>
                  {!tutorMode ? (
                    <View style={[styles.mileIconTile, { backgroundColor: locked ? "#F2EEFF" : "#F2EEFF" }]}>
                      <Text style={[styles.mileIconText, { color: locked ? "#9CA3AF" : "#5B3DF5" }]}>◎</Text>
                    </View>
                  ) : null}
                  <View style={styles.flex}>
                    <View style={styles.mileTitleRow}>
                      <Text style={[styles.mileCardTitle, locked ? styles.mileCardTitleLocked : null]} numberOfLines={2}>{milestone.title}</Text>
                      {!locked && !tutorMode ? <Text style={styles.mileCountPill}>{completedActivities} of {totalActivities}</Text> : null}
                    </View>
                    {!locked ? (
                      <>
                        <View style={styles.mileProgressTrack}>
                          <View style={[styles.mileProgressFill, { backgroundColor: tutorMode ? theme.text : "#5B3DF5", width: (String(Math.max(progress > 0 ? 8 : 0, progressPercent)) + "%") as `${number}%` }]} />
                        </View>
                        {!tutorMode ? <Text style={styles.mileProgressText}>{progressPercent}% complete</Text> : null}
                      </>
                    ) : <Text style={styles.mileActivityText}>Unlocks after previous milestone</Text>}
                  </View>
                </View>
                {!locked && complete ? <Text style={styles.mileActivityText}>{activityText}</Text> : null}
                <View style={[styles.mileCta, locked ? styles.mileCtaLocked : null]}>
                  {!locked ? (
                    <LinearGradient colors={[theme.text, theme.accentStrong]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.mileCtaGradient}>
                      <Text style={styles.mileCtaText}>{ctaLabel}</Text>
                    </LinearGradient>
                  ) : <Text style={[styles.mileCtaText, { color: "#8F8A9D" }]}>{ctaLabel}</Text>}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View> : null}
      {role === "tutor" ? (
        <ProgramArchiveModal
          role={role}
          visible={archiveModalVisible}
          activePrograms={activeTutorPrograms}
          archivedPrograms={archivedTutorPrograms}
          archiveProgram={archiveProgram}
          restoreProgram={restoreProgram}
          loadingAction={loadingAction}
          onClose={() => setArchiveModalVisible(false)}
        />
      ) : null}
    </>
  );
}

function TutorProgramEmptyState({ role, onCreate }: { role: Role; onCreate: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <View style={[styles.tutorEmptyProgramCard, { backgroundColor: "#FFFFFF" }]}>
      <View style={[styles.tutorEmptyIllustration, { backgroundColor: theme.cardAlt }]}>
        <Text style={styles.tutorEmptySparkle}>✦</Text>
        <Text style={styles.tutorEmptyBooks}>🎓</Text>
        <Text style={styles.tutorEmptyBookBase}>▰</Text>
      </View>
      <View style={styles.tutorEmptyBody}>
        <View style={[styles.tutorEmptyChip, { backgroundColor: theme.cardAlt }]}>
          <Text style={[styles.tutorEmptyChipText, { color: theme.text }]}>⚑ Educator programs</Text>
        </View>
        <Text style={styles.tutorEmptyTitle}>Create your first program</Text>
        <Text style={styles.tutorEmptyCopy}>Add a program and configure milestones with your own education content.</Text>
      </View>
      <Pressable style={({ pressed }) => [styles.tutorEmptyAddTile, { borderColor: theme.accentStrong }, pressed && styles.pressed]} onPress={onCreate}>
        <View style={[styles.tutorEmptyAddIcon, { backgroundColor: theme.cardAlt }]}>
          <Text style={[styles.tutorEmptyAddIconText, { color: theme.text }]}>＋</Text>
        </View>
        <Text style={[styles.tutorEmptyAddText, { color: theme.text }]}>Add a program</Text>
      </Pressable>
    </View>
  );
}

function ProgramArchiveModal({
  role,
  visible,
  activePrograms,
  archivedPrograms,
  archiveProgram,
  restoreProgram,
  loadingAction,
  onClose
}: {
  role: Role;
  visible: boolean;
  activePrograms: ProgramSummary[];
  archivedPrograms: ProgramSummary[];
  archiveProgram: (programId?: string | null) => void;
  restoreProgram: (programId?: string | null) => void;
  loadingAction: string | null;
  onClose: () => void;
}) {
  const theme = useRoleTheme(role);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={92} tint="dark" style={styles.modalBackdrop}>
        <View style={styles.programModalCard}>
          <Pressable style={({ pressed }) => [styles.programModalClose, pressed && styles.pressed]} onPress={onClose}>
            <Text style={styles.programModalCloseText}>×</Text>
          </Pressable>
          <Text style={styles.programModalTitle}>Manage archive</Text>
          <Text style={styles.programModalCopy}>Archive active programs or restore archived ones as new in-progress copies.</Text>
          <FieldLabel>Available to archive</FieldLabel>
          {activePrograms.length ? activePrograms.map((program) => (
            <View key={program.id} style={[styles.archiveProgramRow, { backgroundColor: theme.cardAlt }]}>
              <View style={styles.flex}>
                <Text style={styles.archiveProgramTitle}>{program.title}</Text>
                <Text style={styles.archiveProgramMeta}>{programStatusMeta(program).label}</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.archiveActionButton, pressed && styles.pressed]} onPress={() => archiveProgram(program.id)}>
                {loadingAction === "archiveTutorProgram:" + program.id ? <ActivityIndicator size="small" color={theme.text} /> : <Text style={[styles.archiveActionText, { color: theme.text }]}>Archive</Text>}
              </Pressable>
            </View>
          )) : <Muted>No active programs to archive.</Muted>}
          <FieldLabel>Archived programs</FieldLabel>
          {archivedPrograms.length ? archivedPrograms.map((program) => (
            <View key={program.id} style={[styles.archiveProgramRow, { backgroundColor: "#F8FAFC" }]}>
              <View style={styles.flex}>
                <Text style={styles.archiveProgramTitle}>{program.title}</Text>
                <Text style={styles.archiveProgramMeta}>Archived</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.archiveActionButton, pressed && styles.pressed]} onPress={() => restoreProgram(program.id)}>
                {loadingAction === "restoreTutorProgram:" + program.id ? <ActivityIndicator size="small" color={theme.text} /> : <Text style={[styles.archiveActionText, { color: theme.text }]}>Restore</Text>}
              </Pressable>
            </View>
          )) : <Muted>No archived programs yet.</Muted>}
        </View>
      </BlurView>
    </Modal>
  );
}

const resourceTypeOptions: ResourceType[] = ["article", "video", "flashcard", "quiz"];

function TutorProgramAuthoring({
  role,
  programs,
  activePrograms,
  selectedProgram,
  draft,
  setDraft,
  open,
  setOpen,
  createProgram,
  publishProgram,
  archiveProgram,
  loading,
  editingProgramId,
  setEditingProgramId,
  loadProgramForEdit,
  loadingAction
}: {
  role: Role;
  programs: ProgramSummary[];
  activePrograms: ProgramSummary[];
  selectedProgram?: ProgramSummary;
  draft: TutorProgramDraft;
  setDraft: (value: TutorProgramDraft | ((draft: TutorProgramDraft) => TutorProgramDraft)) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  createProgram: () => void;
  publishProgram: (programId: string) => void;
  archiveProgram: (programId?: string | null) => void;
  loading: boolean;
  editingProgramId: string | null;
  setEditingProgramId: (value: string | null) => void;
  loadProgramForEdit: (programId: string) => void;
  loadingAction: string | null;
}) {
  const theme = useRoleTheme(role);
  const updateDraft = (patch: Partial<TutorProgramDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const selectedProgramStatus = programStatusMeta(selectedProgram);
  const selectedProgramEditable = selectedProgram ? !isPublishedProgram(selectedProgram) : false;
  const composerEditable = !editingProgramId || selectedProgramEditable;
  const milestones = draft.milestones?.length ? draft.milestones : [{
    title: draft.milestoneTitle ?? "Milestone 1",
    sequence: 1,
    resources: draft.resources ?? []
  }];
  const defaultActivity = (type: ResourceType = "article"): TutorProgramResourceInput => ({
    type,
    title: type === "video" ? "New concept video" : type === "flashcard" ? "New flashcards" : type === "quiz" ? "New quiz" : "New article",
    description: "Describe what students will learn in this activity.",
    ...(type === "flashcard" ? { flashcards: emptyFlashcards } : {}),
    ...(type === "quiz" ? { quizQuestions: emptyQuizQuestions } : {})
  });
  const updateMilestone = (milestoneIndex: number, patch: Partial<NonNullable<TutorProgramDraft["milestones"]>[number]>) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex ? { ...milestone, ...patch } : milestone)
    }));
  };
  const addMilestone = () => {
    setDraft((current) => ({
      ...current,
      milestones: [
        ...milestones,
        {
          title: `Milestone ${milestones.length + 1}`,
          sequence: milestones.length + 1,
          resources: []
        }
      ]
    }));
  };
  const addActivity = (milestoneIndex: number) => updateMilestone(milestoneIndex, {
    resources: [...milestones[milestoneIndex].resources, defaultActivity("article")]
  });
  const removeMilestone = (milestoneIndex: number) => setDraft((current) => ({
    ...current,
    milestones: milestones.filter((_, index) => index !== milestoneIndex).map((milestone, index) => ({ ...milestone, sequence: index + 1 }))
  }));
  const removeActivity = (milestoneIndex: number, resourceIndex: number) => updateMilestone(milestoneIndex, {
    resources: milestones[milestoneIndex].resources.filter((_, index) => index !== resourceIndex)
  });
  const updateResource = (milestoneIndex: number, resourceIndex: number, patch: Partial<TutorProgramResourceInput>) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex
        ? { ...milestone, resources: milestone.resources.map((resource, innerIndex) => innerIndex === resourceIndex ? { ...resource, ...patch } : resource) }
        : milestone)
    }));
  };
  const pickAuthoringFile = async (onPicked: (uri: string) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*"
    });
    if (!result.canceled && result.assets[0]?.uri) onPicked(result.assets[0].uri);
  };
  const pickAuthoringImage = async (onPicked: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85
    });
    if (!result.canceled && result.assets[0]?.uri) onPicked(result.assets[0].uri);
  };
  const moveActivity = (milestoneIndex: number, resourceIndex: number, direction: -1 | 1) => {
    const nextIndex = resourceIndex + direction;
    const resources = milestones[milestoneIndex]?.resources ?? [];
    if (nextIndex < 0 || nextIndex >= resources.length) return;
    const reordered = [...resources];
    const [item] = reordered.splice(resourceIndex, 1);
    reordered.splice(nextIndex, 0, item);
    updateMilestone(milestoneIndex, { resources: reordered });
    setActiveEditor({ milestoneIndex, resourceIndex: nextIndex });
  };
  const updateFlashcard = (milestoneIndex: number, resourceIndex: number, cardIndex: number, patch: { question?: string; answer?: string; learnMore?: string }) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => {
        if (index !== milestoneIndex) return milestone;
        return {
          ...milestone,
          resources: milestone.resources.map((resource, innerIndex) => {
            if (innerIndex !== resourceIndex) return resource;
            const cards = resource.flashcards?.length ? resource.flashcards : emptyFlashcards;
            return { ...resource, flashcards: cards.map((card, cardInnerIndex) => cardInnerIndex === cardIndex ? { ...card, ...patch } : card) };
          })
        };
      })
    }));
  };
  const addFlashcard = (milestoneIndex: number, resourceIndex: number) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex
        ? {
            ...milestone,
            resources: milestone.resources.map((resource, innerIndex) => innerIndex === resourceIndex
              ? { ...resource, flashcards: [...(resource.flashcards?.length ? resource.flashcards : emptyFlashcards), { question: "New flashcard question", answer: "New flashcard answer", learnMore: "Add a short explanation or next step." }] }
              : resource)
          }
        : milestone)
    }));
  };
  const removeFlashcard = (milestoneIndex: number, resourceIndex: number, cardIndex: number) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex
        ? {
            ...milestone,
            resources: milestone.resources.map((resource, innerIndex) => innerIndex === resourceIndex
              ? { ...resource, flashcards: (resource.flashcards?.length ? resource.flashcards : emptyFlashcards).filter((_, itemIndex) => itemIndex !== cardIndex) }
              : resource)
          }
        : milestone)
    }));
  };
  const updateQuizQuestion = (milestoneIndex: number, resourceIndex: number, questionIndex: number, patch: Partial<NonNullable<TutorProgramResourceInput["quizQuestions"]>[number]>) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => {
        if (index !== milestoneIndex) return milestone;
        return {
          ...milestone,
          resources: milestone.resources.map((resource, innerIndex) => {
            if (innerIndex !== resourceIndex) return resource;
            const questions = resource.quizQuestions?.length ? resource.quizQuestions : emptyQuizQuestions;
            return { ...resource, quizQuestions: questions.map((question, itemIndex) => itemIndex === questionIndex ? { ...question, ...patch } : question) };
          })
        };
      })
    }));
  };
  const updateQuizOption = (milestoneIndex: number, resourceIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const question = milestones[milestoneIndex]?.resources[resourceIndex]?.quizQuestions?.[questionIndex] ?? emptyQuizQuestions[0];
    const options = [...(question.options?.length ? question.options : ["", ""] )];
    options[optionIndex] = value;
    updateQuizQuestion(milestoneIndex, resourceIndex, questionIndex, { options });
  };
  const addQuizOption = (milestoneIndex: number, resourceIndex: number, questionIndex: number) => {
    const question = milestones[milestoneIndex]?.resources[resourceIndex]?.quizQuestions?.[questionIndex] ?? emptyQuizQuestions[0];
    updateQuizQuestion(milestoneIndex, resourceIndex, questionIndex, { options: [...(question.options?.length ? question.options : ["", ""]), ""] });
  };
  const removeQuizOption = (milestoneIndex: number, resourceIndex: number, questionIndex: number, optionIndex: number) => {
    const question = milestones[milestoneIndex]?.resources[resourceIndex]?.quizQuestions?.[questionIndex] ?? emptyQuizQuestions[0];
    const options = (question.options?.length ? question.options : ["", ""]).filter((_, index) => index !== optionIndex);
    const correctOptionIndexes = (question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0])
      .filter((index) => index !== optionIndex)
      .map((index) => index > optionIndex ? index - 1 : index)
      .filter((index) => index >= 0 && index < options.length);
    updateQuizQuestion(milestoneIndex, resourceIndex, questionIndex, {
      options,
      correctOptionIndexes,
      answerIndex: correctOptionIndexes[0] ?? 0
    });
  };
  const toggleQuizCorrectOption = (milestoneIndex: number, resourceIndex: number, questionIndex: number, optionIndex: number) => {
    const question = milestones[milestoneIndex]?.resources[resourceIndex]?.quizQuestions?.[questionIndex] ?? emptyQuizQuestions[0];
    if (question.questionType === "multi") {
      const current = question.correctOptionIndexes?.length ? question.correctOptionIndexes : [];
      const correctOptionIndexes = current.includes(optionIndex) ? current.filter((index) => index !== optionIndex) : [...current, optionIndex].sort((a, b) => a - b);
      updateQuizQuestion(milestoneIndex, resourceIndex, questionIndex, { correctOptionIndexes, answerIndex: correctOptionIndexes[0] ?? 0 });
      return;
    }
    updateQuizQuestion(milestoneIndex, resourceIndex, questionIndex, { correctOptionIndexes: [optionIndex], answerIndex: optionIndex });
  };
  const addQuizQuestion = (milestoneIndex: number, resourceIndex: number) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex
        ? {
            ...milestone,
            resources: milestone.resources.map((resource, innerIndex) => innerIndex === resourceIndex
              ? { ...resource, quizQuestions: [...(resource.quizQuestions?.length ? resource.quizQuestions : emptyQuizQuestions), { prompt: "New quiz question", options: ["Option 1", "Option 2", "Option 3", "Option 4"], answerIndex: 0, learnMore: "Add a short explanation for students.", questionType: "single", correctOptionIndexes: [0], answerText: "" }] }
              : resource)
          }
        : milestone)
    }));
  };
  const removeQuizQuestion = (milestoneIndex: number, resourceIndex: number, questionIndex: number) => {
    setDraft((current) => ({
      ...current,
      milestones: milestones.map((milestone, index) => index === milestoneIndex
        ? {
            ...milestone,
            resources: milestone.resources.map((resource, innerIndex) => innerIndex === resourceIndex
              ? { ...resource, quizQuestions: (resource.quizQuestions?.length ? resource.quizQuestions : emptyQuizQuestions).filter((_, itemIndex) => itemIndex !== questionIndex) }
              : resource)
          }
        : milestone)
    }));
  };
  const canCreate = Boolean(
    draft.title.trim() &&
    draft.description.trim() &&
    milestones.length &&
    milestones.every((milestone) => milestone.title.trim() && milestone.sequence > 0 && milestone.resources.length && milestone.resources.every((resource) => resource.title.trim() && resource.description.trim()))
  );
  const [activeEditor, setActiveEditor] = useState<{ milestoneIndex: number; resourceIndex: number } | null>(null);
  const addActivityOfType = (type: ResourceType) => {
    const milestoneIndex = 0;
    const resources = milestones[milestoneIndex]?.resources ?? [];
    updateMilestone(milestoneIndex, { resources: [...resources, defaultActivity(type)] });
    setActiveEditor({ milestoneIndex, resourceIndex: resources.length });
  };
  const activeMilestone = activeEditor ? milestones[activeEditor.milestoneIndex] : null;
  const activeResource = activeMilestone && activeEditor ? activeMilestone.resources[activeEditor.resourceIndex] : null;

  return (
    <View style={styles.tutorProgramPanel}>
      {activePrograms.length ? (
        <View style={[styles.selectedProgramPanel, { backgroundColor: theme.card }]}>
          <FieldLabel>Configured programs</FieldLabel>
          <DropdownField
            value={selectedProgram ? programOptionLabel(selectedProgram) : "Select program"}
            options={activePrograms.map(programOptionLabel)}
            onSelect={(label) => {
              const program = activePrograms.find((item) => programOptionLabel(item) === label);
              if (!program) return;
              if (isPublishedProgram(program)) {
                setEditingProgramId(null);
                setOpen(false);
              }
              loadProgramForEdit(program.id);
            }}
          />
          {selectedProgram ? (
            <View style={styles.programLifecycleActions}>
              <Button role={role} label="Add New" onPress={() => { setDraft(defaultTutorProgramDraft); setEditingProgramId(null); setOpen(true); }} />
              {!isPublishedProgram(selectedProgram) ? <Button role={role} label="Publish program" onPress={() => publishProgram(selectedProgram.id)} loading={loadingAction === "publishTutorProgram:" + selectedProgram.id} /> : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.tutorProgramSummary, { backgroundColor: theme.card }]}>
          <View style={styles.flex}>
            <Text style={styles.tutorProgramEyebrow}>Educator programs</Text>
            <Text style={styles.tutorProgramTitle}>Create your first program</Text>
            <Text style={styles.tutorProgramCopy}>Add a program and configure milestones with your own education content.</Text>
          </View>
          <Button role={role} label="Add a program" onPress={() => { setDraft(defaultTutorProgramDraft); setEditingProgramId(null); setOpen(true); }} />
        </View>
      )}
      {false && open && composerEditable ? (
        <View style={[styles.tutorComposerCard, { backgroundColor: theme.cardAlt }]}>
          <Text style={styles.tutorComposerTitle}>{editingProgramId ? "Edit program" : "Add a program"}</Text>
          <FieldLabel>Program title</FieldLabel>
          <Input value={draft.title} onChangeText={(title) => updateDraft({ title })} />
          <FieldLabel>Description</FieldLabel>
          <TextInput multiline value={draft.description} onChangeText={(description) => updateDraft({ description })} placeholder="What students will achieve" placeholderTextColor="#94A3B8" style={styles.textArea} />
          <FieldLabel>Visibility</FieldLabel>
          <DropdownField value={draft.visibility === "private" ? "Private draft" : "Published"} options={["Published", "Private draft"]} onSelect={(value) => updateDraft({ visibility: value === "Private draft" ? "private" : "published" })} />
          <FieldLabel>Program fee</FieldLabel>
          <DropdownField value={draft.feeType === "paid" ? "Paid" : "Free"} options={["Free", "Paid"]} onSelect={(value) => updateDraft({ feeType: value === "Paid" ? "paid" : "free", feeAmount: value === "Paid" ? draft.feeAmount ?? 2500 : null })} />
          {draft.feeType === "paid" ? (
            <>
              <FieldLabel>Fee amount</FieldLabel>
              <Input keyboardType="numeric" value={String(draft.feeAmount ?? "")} onChangeText={(value) => updateDraft({ feeAmount: Number(value.replace(/\D/g, "")) || 0 })} />
            </>
          ) : null}
          {milestones.map((milestone, milestoneIndex) => (
            <View key={`${milestone.sequence}-${milestoneIndex}`} style={styles.tutorMilestoneEditor}>
              <View style={styles.rowBetween}>
                <Text style={styles.tutorResourceTitle}>Milestone {milestoneIndex + 1}</Text>
                <Pressable onPress={() => removeMilestone(milestoneIndex)}><Text style={styles.tutorResourcePill}>Delete</Text></Pressable>
              </View>
              <FieldLabel>Milestone title</FieldLabel>
              <Input value={milestone.title} onChangeText={(title) => updateMilestone(milestoneIndex, { title })} />
              <FieldLabel>Sequence</FieldLabel>
              <Input keyboardType="numeric" value={String(milestone.sequence)} onChangeText={(value) => updateMilestone(milestoneIndex, { sequence: Number(value.replace(/\D/g, "")) || milestoneIndex + 1 })} />
              {milestone.resources.map((resource, index) => (
            <View key={`${resource.type}-${index}`} style={styles.tutorResourceEditor}>
              <View style={styles.rowBetween}>
                <Text style={styles.tutorResourceTitle}>Activity {index + 1}</Text>
                <Pressable onPress={() => removeActivity(milestoneIndex, index)}><Text style={styles.tutorResourcePill}>Delete</Text></Pressable>
              </View>
              <FieldLabel>Activity type</FieldLabel>
              <DropdownField value={capitalize(resource.type)} options={resourceTypeOptions.map(capitalize)} onSelect={(value) => updateResource(milestoneIndex, index, { type: value.toLowerCase() as ResourceType })} />
              <FieldLabel>Title</FieldLabel>
              <Input value={resource.title} onChangeText={(title) => updateResource(milestoneIndex, index, { title })} />
              <FieldLabel>Description</FieldLabel>
              <TextInput multiline value={resource.description} onChangeText={(description) => updateResource(milestoneIndex, index, { description })} placeholder="Student-facing summary" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
              <FieldLabel>Thumbnail path</FieldLabel>
              <Input value={resource.thumbnailPath ?? ""} onChangeText={(thumbnailPath) => updateResource(milestoneIndex, index, { thumbnailPath })} placeholder="/api/v1/ams/files/..." />
              <FieldLabel>Banner path</FieldLabel>
              <Input value={resource.bannerPath ?? ""} onChangeText={(bannerPath) => updateResource(milestoneIndex, index, { bannerPath })} placeholder="/api/v1/ams/files/..." />
              {resource.type === "article" ? (
                <>
                  <FieldLabel>Article body</FieldLabel>
                  <TextInput multiline value={resource.body ?? ""} onChangeText={(body) => updateResource(milestoneIndex, index, { body })} placeholder="Notes, examples, and board-style guidance" placeholderTextColor="#94A3B8" style={styles.textArea} />
                </>
              ) : null}
              {resource.type === "video" ? (
                <>
                  <FieldLabel>Video URL</FieldLabel>
                  <Input value={resource.mediaUrl ?? ""} onChangeText={(mediaUrl) => updateResource(milestoneIndex, index, { mediaUrl })} placeholder="Private video URL or AMS asset URL" />
                </>
              ) : null}
              {resource.type === "flashcard" ? (
                <>
                  {(resource.flashcards?.length ? resource.flashcards : emptyFlashcards).map((card, cardIndex) => (
                    <View key={cardIndex} style={styles.flashcardEditorRow}>
                      <View style={styles.rowBetween}>
                        <FieldLabel>Flashcard {cardIndex + 1}</FieldLabel>
                        <Pressable onPress={() => removeFlashcard(milestoneIndex, index, cardIndex)}><Text style={styles.tutorResourcePill}>Delete</Text></Pressable>
                      </View>
                      <Input value={card.question} onChangeText={(question) => updateFlashcard(milestoneIndex, index, cardIndex, { question })} placeholder="Question" />
                      <Input value={card.answer} onChangeText={(answer) => updateFlashcard(milestoneIndex, index, cardIndex, { answer })} placeholder="Answer" />
                      <TextInput multiline value={card.learnMore ?? ""} onChangeText={(learnMore) => updateFlashcard(milestoneIndex, index, cardIndex, { learnMore })} placeholder="Learn more guidance" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                    </View>
                  ))}
                  <Button role={role} variant="secondary" label="Add flashcard" onPress={() => addFlashcard(milestoneIndex, index)} />
                </>
              ) : null}
              {resource.type === "quiz" ? (
                <>
                  {(resource.quizQuestions?.length ? resource.quizQuestions : emptyQuizQuestions).map((question, questionIndex) => (
                    <View key={questionIndex} style={styles.quizEditorRow}>
                      <View style={styles.rowBetween}>
                        <FieldLabel>Quiz question {questionIndex + 1}</FieldLabel>
                        <Pressable onPress={() => removeQuizQuestion(milestoneIndex, index, questionIndex)}><Text style={styles.tutorResourcePill}>Delete</Text></Pressable>
                      </View>
                      <TextInput multiline value={question.prompt} onChangeText={(prompt) => updateQuizQuestion(milestoneIndex, index, questionIndex, { prompt })} placeholder="Question prompt" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                      <FieldLabel>Question type</FieldLabel>
                      <DropdownField
                        value={question.questionType === "multi" ? "Multi choice" : question.questionType === "free_text" ? "Free text" : "Single choice"}
                        options={["Single choice", "Multi choice", "Free text"]}
                        onSelect={(value) => updateQuizQuestion(milestoneIndex, index, questionIndex, {
                          questionType: value === "Multi choice" ? "multi" : value === "Free text" ? "free_text" : "single"
                        })}
                      />
                      <FieldLabel>Options, separated by comma</FieldLabel>
                      <Input value={(question.options ?? []).join(", ")} onChangeText={(value) => updateQuizQuestion(milestoneIndex, index, questionIndex, { options: value.split(",").map((option) => option.trim()).filter(Boolean) })} />
                      {question.questionType === "multi" ? (
                        <>
                          <FieldLabel>Correct option numbers</FieldLabel>
                          <Input
                            value={(question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0]).map((item) => String(item + 1)).join(", ")}
                            onChangeText={(value) => updateQuizQuestion(milestoneIndex, index, questionIndex, {
                              correctOptionIndexes: value.split(",").map((item) => Number(item.trim()) - 1).filter((item) => Number.isFinite(item) && item >= 0)
                            })}
                            placeholder="1, 3"
                          />
                        </>
                      ) : question.questionType === "free_text" ? (
                        <>
                          <FieldLabel>Expected answer text</FieldLabel>
                          <TextInput multiline value={question.answerText ?? ""} onChangeText={(answerText) => updateQuizQuestion(milestoneIndex, index, questionIndex, { answerText })} placeholder="Model answer or accepted phrase" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                        </>
                      ) : (
                        <>
                          <FieldLabel>Correct option number</FieldLabel>
                          <DropdownField value={String((question.answerIndex ?? 0) + 1)} options={["1", "2", "3", "4"]} onSelect={(value) => updateQuizQuestion(milestoneIndex, index, questionIndex, { answerIndex: Number(value) - 1, correctOptionIndexes: [Number(value) - 1] })} />
                        </>
                      )}
                      <FieldLabel>Learn more</FieldLabel>
                      <TextInput multiline value={question.learnMore ?? ""} onChangeText={(learnMore) => updateQuizQuestion(milestoneIndex, index, questionIndex, { learnMore })} placeholder="Explanation shown after answering" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                    </View>
                  ))}
                  <Button role={role} variant="secondary" label="Add quiz question" onPress={() => addQuizQuestion(milestoneIndex, index)} />
                </>
              ) : null}
            </View>
              ))}
              <Button role={role} variant="secondary" label="Add activity" onPress={() => addActivity(milestoneIndex)} />
            </View>
          ))}
          <Button role={role} variant="secondary" label="Add milestone" onPress={addMilestone} />
          <Button role={role} label={editingProgramId ? "Save updates" : "Create program"} onPress={createProgram} disabled={!canCreate} loading={loading} />
        </View>
      ) : null}
      <Modal visible={open && composerEditable} transparent animationType="slide">
        <BlurView intensity={90} tint="light" style={styles.authoringBackdrop}>
          <View style={styles.authoringModalShell}>
            <View style={styles.authoringHeader}>
              <Text style={styles.authoringTitle}>{editingProgramId ? "Edit Program" : "Add New Program"}</Text>
              <Pressable style={({ pressed }) => [styles.authoringClose, pressed && styles.pressed]} onPress={() => setOpen(false)}>
                <Text style={styles.authoringCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.authoringContent}>
              <FieldLabel>1. Title of Program *</FieldLabel>
              <Input value={draft.title} onChangeText={(title) => updateDraft({ title })} placeholder="Enter program title" />
              <FieldLabel>2. Description of Program *</FieldLabel>
              <TextInput multiline value={draft.description} onChangeText={(description) => updateDraft({ description })} placeholder="Enter program description..." placeholderTextColor="#94A3B8" style={styles.authoringDescription} maxLength={1000} />
              <Text style={styles.authoringCounter}>{draft.description.length}/1000</Text>
              <FieldLabel>3. Add Program Items</FieldLabel>
              <Text style={styles.authoringHint}>Add different types of content and arrange them in your desired sequence.</Text>
              <View style={styles.authoringItemTypeGrid}>
                {resourceTypeOptions.map((type) => (
                  <Pressable key={type} style={({ pressed }) => [styles.authoringTypeButton, pressed && styles.pressed]} onPress={() => addActivityOfType(type)}>
                    <View style={[styles.authoringTypeIcon, { backgroundColor: type === "video" ? "#EDE9FE" : type === "article" ? "#DCFCE7" : type === "flashcard" ? "#FFEDD5" : "#DBEAFE" }]}>
                      <Text style={[styles.authoringTypeIconText, { color: type === "video" ? theme.text : type === "article" ? "#16A34A" : type === "flashcard" ? "#F97316" : "#2563EB" }]}>{type === "video" ? "▶" : type === "article" ? "▤" : type === "flashcard" ? "▣" : "?"}</Text>
                    </View>
                    <Text style={styles.authoringTypeLabel}>{capitalize(type)}</Text>
                    <Text style={styles.authoringPlus}>＋</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.authoringMilestoneToolbar}>
                <Text style={styles.authoringSectionTitle}>Milestones & items</Text>
                <Pressable style={({ pressed }) => [styles.authoringSmallAction, pressed && styles.pressed]} onPress={addMilestone}>
                  <Text style={[styles.authoringSmallActionText, { color: theme.text }]}>＋ Milestone</Text>
                </Pressable>
              </View>
              {milestones.map((milestone, milestoneIndex) => (
                <View key={`${milestone.sequence}-${milestoneIndex}`} style={styles.authoringMilestoneBlock}>
                  <View style={styles.authoringMilestoneHeader}>
                    <View style={styles.flex}>
                      <FieldLabel>Milestone {milestoneIndex + 1}</FieldLabel>
                      <Input value={milestone.title} onChangeText={(title) => updateMilestone(milestoneIndex, { title })} />
                    </View>
                    {milestones.length > 1 ? <Pressable onPress={() => removeMilestone(milestoneIndex)}><Text style={styles.authoringDelete}>Delete</Text></Pressable> : null}
                  </View>
                  {milestone.resources.length ? milestone.resources.map((resource, resourceIndex) => {
                    const selected = activeEditor?.milestoneIndex === milestoneIndex && activeEditor.resourceIndex === resourceIndex;
                    return (
                      <Pressable key={`${resource.type}-${resourceIndex}`} style={({ pressed }) => [styles.authoringResourceRow, selected && { borderColor: theme.text }, pressed && styles.pressed]} onPress={() => setActiveEditor({ milestoneIndex, resourceIndex })}>
                        <View style={styles.authoringMoveStack}>
                          <Pressable onPress={() => moveActivity(milestoneIndex, resourceIndex, -1)}><Text style={styles.authoringMoveText}>↑</Text></Pressable>
                          <Pressable onPress={() => moveActivity(milestoneIndex, resourceIndex, 1)}><Text style={styles.authoringMoveText}>↓</Text></Pressable>
                        </View>
                        <View style={styles.authoringSequence}><Text style={styles.authoringSequenceText}>{resourceIndex + 1}</Text></View>
                        <View style={styles.flex}>
                          <Text style={styles.authoringResourceTitle}>{resource.title || `${capitalize(resource.type)} title`}</Text>
                          <Text style={styles.authoringResourceMeta}>{resource.description || "Tap to add details"}</Text>
                        </View>
                        <Text style={[styles.authoringTypeBadge, { color: typeColor(resource.type), backgroundColor: typeBg(resource.type) }]}>{capitalize(resource.type)}</Text>
                        <Text style={styles.authoringResourceMeta}>{resource.type === "flashcard" ? `${resource.flashcards?.length ?? 0} cards` : resource.type === "quiz" ? `${resource.quizQuestions?.length ?? 0} questions` : ""}</Text>
                        <Pressable onPress={() => { removeActivity(milestoneIndex, resourceIndex); setActiveEditor(null); }}><Text style={styles.authoringKebab}>×</Text></Pressable>
                      </Pressable>
                    );
                  }) : <Text style={styles.authoringHint}>No items yet. Use Video, Article, Flashcards, or Quiz above.</Text>}
                </View>
              ))}
              {activeResource && activeEditor ? (
                <View style={styles.authoringEditorPanel}>
                  <View style={styles.authoringHeader}>
                    <Text style={styles.authoringSectionTitle}>Add {capitalize(activeResource.type)}</Text>
                    <Pressable onPress={() => setActiveEditor(null)}><Text style={styles.authoringCloseText}>×</Text></Pressable>
                  </View>
                  <FieldLabel>Title *</FieldLabel>
                  <Input value={activeResource.title} onChangeText={(title) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { title })} placeholder={`Enter ${activeResource.type} title`} />
                  <FieldLabel>Description *</FieldLabel>
                  <TextInput multiline value={activeResource.description} onChangeText={(description) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { description })} placeholder={`Enter ${activeResource.type} description`} placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                  <FieldLabel>Thumbnail</FieldLabel>
                  {activeResource.thumbnailPath ? <Image source={{ uri: activeResource.thumbnailPath }} style={styles.authoringImagePreview} resizeMode="cover" /> : null}
                  <UploadOption title={activeResource.thumbnailPath ? "Change thumbnail" : "Upload thumbnail"} action="Image" onPress={() => pickAuthoringImage((thumbnailPath) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { thumbnailPath }))} />
                  <FieldLabel>Banner</FieldLabel>
                  {activeResource.bannerPath ? <Image source={{ uri: activeResource.bannerPath }} style={styles.authoringBannerPreview} resizeMode="cover" /> : null}
                  <UploadOption title={activeResource.bannerPath ? "Change banner" : "Upload banner"} action="Image" onPress={() => pickAuthoringImage((bannerPath) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { bannerPath }))} />
                  {activeResource.type === "video" ? (
                    <View style={styles.authoringUploadGrid}>
                      <FieldLabel>Video file</FieldLabel>
                      <UploadOption title="Upload video" action={activeResource.mediaUrl ? "Selected" : "MP4"} onPress={() => pickAuthoringFile((mediaUrl) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { mediaUrl }))} />
                      {activeResource.mediaUrl ? <Text style={styles.authoringUploadNote} numberOfLines={1}>{activeResource.mediaUrl}</Text> : null}
                      <Text style={styles.authoringUploadNote}>Supported file type: mp4</Text>
                      <FieldLabel>Subtitle file</FieldLabel>
                      <UploadOption title="Upload captions" action={activeResource.vttPath ? "Selected" : "VTT"} onPress={() => pickAuthoringFile((vttPath) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { vttPath }))} />
                      {activeResource.vttPath ? <Text style={styles.authoringUploadNote} numberOfLines={1}>{activeResource.vttPath}</Text> : null}
                      <Text style={styles.authoringUploadNote}>Supported file type: vtt</Text>
                      <FieldLabel>Body</FieldLabel>
                      <UploadOption title="Upload notes" action={activeResource.metadataPath ? "Selected" : "Document"} onPress={() => pickAuthoringFile((metadataPath) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { metadataPath }))} />
                      {activeResource.metadataPath ? <Text style={styles.authoringUploadNote} numberOfLines={1}>{activeResource.metadataPath}</Text> : null}
                      <Text style={styles.authoringUploadNote}>Supported file types: pdf, word, md</Text>
                    </View>
                  ) : null}
                  {activeResource.type === "article" ? (
                    <View style={styles.authoringUploadGrid}>
                      <FieldLabel>Article body</FieldLabel>
                      <UploadOption title="Upload body" action={activeResource.metadataPath ? "Selected" : "Document"} onPress={() => pickAuthoringFile((metadataPath) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { metadataPath }))} />
                      {activeResource.metadataPath ? <Text style={styles.authoringUploadNote} numberOfLines={1}>{activeResource.metadataPath}</Text> : null}
                      <Text style={styles.authoringUploadNote}>Supported file types: pdf, word</Text>
                      <TextInput multiline value={activeResource.body ?? ""} onChangeText={(body) => updateResource(activeEditor.milestoneIndex, activeEditor.resourceIndex, { body })} placeholder="Notes, examples, and board-style guidance" placeholderTextColor="#94A3B8" style={styles.textArea} />
                    </View>
                  ) : null}
                  {activeResource.type === "flashcard" ? (
                    <View style={styles.authoringSplitEditor}>
                      {(activeResource.flashcards?.length ? activeResource.flashcards : emptyFlashcards).map((card, cardIndex) => (
                        <View key={cardIndex} style={styles.authoringNestedCard}>
                          <View style={styles.rowBetween}><FieldLabel>Card {cardIndex + 1}</FieldLabel><Pressable onPress={() => removeFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex, cardIndex)}><Text style={styles.authoringDelete}>Delete</Text></Pressable></View>
                          <Input value={card.question} onChangeText={(question) => updateFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex, cardIndex, { question })} placeholder="Front question or term" />
                          <Input value={card.answer} onChangeText={(answer) => updateFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex, cardIndex, { answer })} placeholder="Back answer" />
                          <FieldLabel>More details</FieldLabel>
                          <UploadOption title="Upload details" action="Document" onPress={() => pickAuthoringFile((learnMore) => updateFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex, cardIndex, { learnMore }))} />
                          <Text style={styles.authoringUploadNote}>Supported file types: pdf, word, md</Text>
                          <TextInput multiline value={card.learnMore ?? ""} onChangeText={(learnMore) => updateFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex, cardIndex, { learnMore })} placeholder="More details" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                        </View>
                      ))}
                      <Button role={role} variant="secondary" label="Add Card" onPress={() => addFlashcard(activeEditor.milestoneIndex, activeEditor.resourceIndex)} />
                    </View>
                  ) : null}
                  {activeResource.type === "quiz" ? (
                    <View style={styles.authoringSplitEditor}>
                      {(activeResource.quizQuestions?.length ? activeResource.quizQuestions : emptyQuizQuestions).map((question, questionIndex) => (
                        <View key={questionIndex} style={styles.authoringNestedCard}>
                          <View style={styles.rowBetween}><FieldLabel>Question {questionIndex + 1}</FieldLabel><Pressable onPress={() => removeQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex)}><Text style={styles.authoringDelete}>Delete</Text></Pressable></View>
                          <FieldLabel>Question Type</FieldLabel>
                          <DropdownField value={question.questionType === "multi" ? "Multiple Choice" : question.questionType === "free_text" ? "Free Text" : "Single Choice"} options={["Single Choice", "Multiple Choice", "Free Text"]} onSelect={(value) => {
                            const questionType = value === "Multiple Choice" ? "multi" : value === "Free Text" ? "free_text" : "single";
                            const firstCorrect = question.correctOptionIndexes?.[0] ?? question.answerIndex ?? 0;
                            updateQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, {
                              questionType,
                              correctOptionIndexes: questionType === "multi" ? (question.correctOptionIndexes?.length ? question.correctOptionIndexes : [firstCorrect]) : [firstCorrect],
                              answerIndex: firstCorrect
                            });
                          }} />
                          <FieldLabel>Question *</FieldLabel>
                          <TextInput multiline value={question.prompt} onChangeText={(prompt) => updateQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, { prompt })} placeholder="Enter your question" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                          {question.questionType === "free_text" ? (
                            <>
                              <FieldLabel>Expected answer</FieldLabel>
                              <TextInput multiline value={question.answerText ?? ""} onChangeText={(answerText) => updateQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, { answerText })} placeholder="Model answer or accepted phrase" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                            </>
                          ) : (
                            <View style={styles.quizOptionGroup}>
                              <FieldLabel>Options</FieldLabel>
                              {(question.options?.length ? question.options : ["", ""]).map((option, optionIndex) => {
                                const correctIndexes = question.correctOptionIndexes?.length ? question.correctOptionIndexes : [question.answerIndex ?? 0];
                                const selected = correctIndexes.includes(optionIndex);
                                return (
                                  <View key={optionIndex} style={styles.quizOptionRow}>
                                    <TextInput value={option} onChangeText={(value) => updateQuizOption(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, optionIndex, value)} placeholder={`Option ${optionIndex + 1}`} placeholderTextColor="#94A3B8" style={styles.quizOptionInput} />
                                    <Pressable style={({ pressed }) => [styles.quizCorrectToggle, selected ? styles.quizCorrectToggleOn : styles.quizCorrectToggleOff, pressed && styles.pressed]} onPress={() => toggleQuizCorrectOption(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, optionIndex)}>
                                      <Text style={[styles.quizCorrectToggleText, selected ? styles.quizCorrectToggleTextOn : styles.quizCorrectToggleTextOff]}>{selected ? "Correct" : "Incorrect"}</Text>
                                    </Pressable>
                                    {(question.options?.length ?? 0) > 2 ? <Pressable style={({ pressed }) => [styles.quizOptionDelete, pressed && styles.pressed]} onPress={() => removeQuizOption(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, optionIndex)}><Text style={styles.quizOptionDeleteText}>×</Text></Pressable> : null}
                                  </View>
                                );
                              })}
                              <Pressable style={({ pressed }) => [styles.quizAddOption, pressed && styles.pressed]} onPress={() => addQuizOption(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex)}>
                                <Text style={[styles.quizAddOptionText, { color: theme.text }]}>＋ Add Option</Text>
                              </Pressable>
                            </View>
                          )}
                          <FieldLabel>Explanation</FieldLabel>
                          <UploadOption title="Upload explanation" action="Document" onPress={() => pickAuthoringFile((learnMore) => updateQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, { learnMore }))} />
                          <Text style={styles.authoringUploadNote}>Supported file types: pdf, word, md</Text>
                          <TextInput multiline value={question.learnMore ?? ""} onChangeText={(learnMore) => updateQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex, questionIndex, { learnMore })} placeholder="Explanation" placeholderTextColor="#94A3B8" style={styles.textAreaSmall} />
                        </View>
                      ))}
                      <Button role={role} variant="secondary" label="Add Question" onPress={() => addQuizQuestion(activeEditor.milestoneIndex, activeEditor.resourceIndex)} />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.authoringFooter}>
              <Button role={role} variant="secondary" label="Cancel" onPress={() => setOpen(false)} />
              <Button role={role} label={editingProgramId ? "Save Program" : "Create Program"} onPress={createProgram} disabled={!canCreate} loading={loading} />
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

function typeBg(type: ResourceType) {
  if (type === "video") return "#EDE9FE";
  if (type === "article") return "#DCFCE7";
  if (type === "flashcard") return "#FFEDD5";
  return "#DBEAFE";
}

function typeColor(type: ResourceType) {
  if (type === "video") return "#6D4CE8";
  if (type === "article") return "#16A34A";
  if (type === "flashcard") return "#F97316";
  return "#2563EB";
}

function UploadOption({ title, action, onPress }: { title: string; action: string; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.authoringUploadOption, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.authoringUploadIcon}><Text style={styles.authoringUploadIconText}>⇧</Text></View>
      <View style={styles.flex}>
        <Text style={styles.authoringUploadTitle}>{title}</Text>
        <Text style={styles.authoringUploadMeta}>{action}</Text>
      </View>
    </Pressable>
  );
}

function ProgramPickerModal({
  role,
  visible,
  programs,
  selectedPrograms,
  selectedProgramId,
  setSelectedProgramId,
  preparing,
  canClose,
  onClose,
  onContinue
}: {
  role: Role;
  visible: boolean;
  programs: ProgramSummary[];
  selectedPrograms: ProgramSummary[];
  selectedProgramId: string | null;
  setSelectedProgramId: (value: string | null) => void;
  preparing: boolean;
  canClose: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  const theme = useRoleTheme(role);
  const selectedIds = new Set(selectedPrograms.map((program) => program.id));
  const availablePrograms = role === "student" && selectedPrograms.length > 0 ? programs.filter((program) => !selectedIds.has(program.id)) : programs;
  const modalPrograms = role === "student" ? availablePrograms : availablePrograms.length ? availablePrograms : programs;
  const selectedProgram = modalPrograms.find((program) => program.id === selectedProgramId) ?? modalPrograms[0];
  const selectionFull = role === "student" && selectedPrograms.length >= 3;
  const noAvailablePrograms = role === "student" && !selectionFull && modalPrograms.length === 0;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={95} tint="dark" style={styles.modalBackdrop}>
        <View style={styles.programModalCard}>
          {preparing ? (
            <View style={styles.programPreparing}>
              <ActivityIndicator color={theme.accentStrong} size="large" />
              <Text style={styles.programModalTitle}>We're preparing your program, thanks for your patience.</Text>
            </View>
          ) : (
            <>
              {canClose ? (
                <Pressable style={({ pressed }) => [styles.programModalClose, pressed && styles.pressed]} onPress={onClose}>
                  <Text style={styles.programModalCloseText}>×</Text>
                </Pressable>
              ) : null}
              <Text style={styles.programModalTitle}>Choose your program</Text>
              <Text style={styles.programModalCopy}>{canClose && role === "student" ? "Select another program to follow in My Miles." : "Select the plan you want to follow in My Miles."}</Text>
              <FieldLabel>Program</FieldLabel>
              <DropdownField
                value={selectionFull ? "Maximum 3 programs selected" : noAvailablePrograms ? "No other programs available" : selectedProgram?.title ?? "Select program"}
                options={selectionFull ? ["Maximum 3 programs selected"] : noAvailablePrograms ? ["No other programs available"] : modalPrograms.map((program) => program.title)}
                onSelect={(title) => setSelectedProgramId(modalPrograms.find((program) => program.title === title)?.id ?? null)}
              />
              <View style={styles.modalBottomCta}>
                <Button role={role} label="Continue" onPress={onContinue} disabled={!selectedProgram || selectionFull || noAvailablePrograms} />
              </View>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

function TutorDiscovery({
  role,
  tutors,
  marketplaceTarget,
  clearTargetTutor,
  options,
  loading,
  requestBatch,
  addTutorProgram,
  requestProgramPurchase,
  requestLoading,
  search,
  back
}: {
  role: Role;
  tutors: TutorSearchResult[];
  marketplaceTarget?: MarketplaceTarget | null;
  clearTargetTutor: () => void;
  options: TutorFilterOptions;
  loading: boolean;
  requestBatch: (batchId: string) => void;
  addTutorProgram: (programId: string) => void;
  requestProgramPurchase: (programId: string) => void;
  requestLoading: string | null;
  search: (filters: { subject?: string; location?: string; grade?: string; board?: string; mode?: string; language?: string; gender?: string; experience?: string; rating?: string }) => void;
  back: () => void;
}) {
  const any = "Any";
  const theme = useRoleTheme(role);
  const [selectedTutor, setSelectedTutor] = useState<TutorSearchResult | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"core" | "logistics" | "profile">("core");
  const [subject, setSubject] = useState(any);
  const [location, setLocation] = useState(any);
  const [grade, setGrade] = useState(any);
  const [board, setBoard] = useState(any);
  const [mode, setMode] = useState(any);
  const [language, setLanguage] = useState(any);
  const [gender, setGender] = useState(any);
  const [experience, setExperience] = useState(any);
  const [rating, setRating] = useState(any);
  useEffect(() => {
    if (!marketplaceTarget?.tutorProfileId || selectedTutor?.tutorProfileId === marketplaceTarget.tutorProfileId) return;
    const matched = tutors.find((tutor) => tutor.tutorProfileId === marketplaceTarget.tutorProfileId || tutor.id === marketplaceTarget.tutorProfileId);
    if (matched) setSelectedTutor(matched);
  }, [marketplaceTarget?.tutorProfileId, tutors, selectedTutor?.tutorProfileId]);
  useEffect(() => {
    if (!selectedTutor) return;
    const updated = tutors.find((tutor) => tutor.tutorProfileId === selectedTutor.tutorProfileId || tutor.id === selectedTutor.id);
    if (updated && updated !== selectedTutor) setSelectedTutor(updated);
  }, [selectedTutor, tutors]);
  const cleaned = (value: string) => value === any ? undefined : value;
  const filters = {
    subject: cleaned(subject),
    location: cleaned(location),
    grade: cleaned(grade),
    board: cleaned(board),
    mode: cleaned(mode),
    language: cleaned(language),
    gender: cleaned(gender),
    experience: cleaned(experience),
    rating: cleaned(rating)
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const applyFilters = () => {
    if (!activeFilterCount) return;
    setFilterOpen(false);
    search(filters);
  };
  if (selectedTutor) {
    return (
      <>
        <TopBar title={selectedTutor.name} left="‹" onLeft={() => { clearTargetTutor(); setSelectedTutor(null); }} />
        <View style={styles.tutorCard}>
          <View style={styles.tutorHeaderRow}>
            <Avatar role="tutor" label={selectedTutor.initials} />
            <View style={styles.flex}>
              <Text style={styles.tutorName}>{selectedTutor.name}</Text>
              <Text style={styles.tutorHeadline}>{selectedTutor.headline}</Text>
            </View>
            <View style={styles.ratingBadge}><Text style={styles.ratingText}>★ {selectedTutor.rating}</Text></View>
          </View>
          <Text style={styles.tutorMeta}>{selectedTutor.subjects.join(", ")} • {selectedTutor.boards.join(", ")} • {selectedTutor.location}</Text>
          <Text style={styles.tutorMeta}>{selectedTutor.experienceYears} yrs exp • ₹{selectedTutor.hourlyRate}/hr • {selectedTutor.mode.join(" / ")}</Text>
          <Text style={styles.tutorBio}>{selectedTutor.bio}</Text>
        </View>
        <SectionTitle>Program offerings</SectionTitle>
        {selectedTutor.programs?.length ? selectedTutor.programs.map((program) => (
          <View key={program.id} style={[styles.batchMiniCard, marketplaceTarget?.kind === "program" && marketplaceTarget.itemId === program.id && styles.marketplaceFocusedCard]}>
            {marketplaceTarget?.kind === "program" && marketplaceTarget.itemId === program.id ? <Text style={styles.marketplaceFocusLabel}>Recommended for you</Text> : null}
            <View style={styles.rowBetween}>
              <Text style={styles.batchTitle}>{program.title}</Text>
              <Text style={styles.tutorResourcePill}>{program.feeType === "paid" ? "₹" + (program.feeAmount ?? 0) : "Free"}</Text>
            </View>
            <Text style={styles.batchMeta}>{program.description}</Text>
            <Text style={styles.batchMeta}>{program.milestoneCount} milestones • {program.activityCount} activities</Text>
            <Button
              role={role}
              label={program.selected ? "Added to Program" : program.feeType === "paid" ? "Request purchase details" : "Add free program"}
              disabled={!!program.selected}
              loading={requestLoading === "addTutorProgram:" + program.id || requestLoading === "purchaseProgram:" + program.id}
              onPress={() => program.feeType === "paid" ? requestProgramPurchase(program.id) : addTutorProgram(program.id)}
            />
          </View>
        )) : <View style={styles.emptyInlineCard}><Text style={styles.todayTitle}>No programs yet</Text><Text style={styles.todayMeta}>This tutor has not published any program offerings.</Text></View>}
        <SectionTitle>Batches</SectionTitle>
        {selectedTutor.batches.map((batch) => {
          const enrolled = batch.studentEnrollmentStatus === "active";
          const pending = batch.studentRequestStatus === "pending";
          const unavailable = batch.availabilityStatus === "booked";
          const terminalStatus = batch.studentRequestStatus === "rejected" ? "Request denied" : batch.studentRequestStatus === "deferred" ? "Deferred" : batch.studentRequestStatus === "suggested" ? "Suggestion sent" : null;
          const label = enrolled ? "Enrolled" : pending ? "Request pending" : terminalStatus ?? (unavailable ? "Batch full" : "Request batch");
          const focused = marketplaceTarget?.kind === "batch" && marketplaceTarget.itemId === batch.id;
          return (
            <View key={batch.id} style={[styles.batchMiniCard, focused && styles.marketplaceFocusedCard]}>
              {focused ? <Text style={styles.marketplaceFocusLabel}>Recommended batch</Text> : null}
              <View style={styles.rowBetween}>
                <Text style={styles.batchTitle}>{batch.title}</Text>
                <Text style={styles.tutorResourcePill}>{batch.availabilityStatus === "booked" ? "Booked" : batch.availabilityStatus === "filling_fast" ? "Filling fast" : "Available"}</Text>
              </View>
              <Text style={styles.batchMeta}>{batch.course} • {batch.schedule}</Text>
              <Text style={styles.batchMeta}>{batch.mode}{batch.classroomLocation ? " • " + batch.classroomLocation : ""}</Text>
              <Text style={styles.batchMeta}>{batch.enrolledCount}/{batch.capacity} seats filled • {batch.fillPercent ?? 0}%</Text>
              <Button role={role} label={label} disabled={enrolled || pending || unavailable} loading={requestLoading === "requestBatch:" + batch.id} onPress={() => requestBatch(batch.id)} />
            </View>
          );
        })}
      </>
    );
  }
  const renderFilterFields = () => {
    if (filterTab === "core") {
      return <>
        <FilterDropdown label="Subject" value={subject} options={[any, ...options.subjects]} onSelect={setSubject} />
        <FilterDropdown label="Class / grade" value={grade} options={[any, ...options.grades]} onSelect={setGrade} />
        <FilterDropdown label="Board optional" value={board} options={[any, ...options.boards]} onSelect={setBoard} />
      </>;
    }
    if (filterTab === "logistics") {
      return <>
        <FilterDropdown label="Location" value={location} options={[any, ...options.locations]} onSelect={setLocation} />
        <FilterDropdown label="Mode" value={mode} options={[any, ...options.modes]} onSelect={setMode} />
        <FilterDropdown label="Gender" value={gender} options={[any, ...options.genders]} onSelect={setGender} />
        <FilterDropdown label="Language" value={language} options={[any, ...options.languages]} onSelect={setLanguage} />
      </>;
    }
    return <>
      <FilterDropdown label="Experience" value={experience} options={[any, ...options.experience]} onSelect={setExperience} />
      <FilterDropdown label="Rating" value={rating} options={[any, ...options.ratings]} onSelect={setRating} />
    </>;
  };
  return (
    <>
      <TopBar title="Find tutor" left="‹" onLeft={back} />
      <Button role={role} label={activeFilterCount ? "Find a tutor (" + activeFilterCount + ")" : "Find a tutor"} onPress={() => setFilterOpen(true)} />
      {loading ? <ActivityIndicator /> : null}
      <View style={styles.tutorCardGrid}>
        {tutors.map((tutor) => (
          <Pressable key={tutor.id} style={({ pressed }) => [styles.tutorGridCard, pressed && styles.pressed]} onPress={() => setSelectedTutor(tutor)}>
            <View style={styles.rowBetween}>
              <Avatar role="tutor" label={tutor.initials} />
              <View style={styles.ratingBadge}><Text style={styles.ratingText}>★ {tutor.rating}</Text></View>
            </View>
            <Text style={styles.tutorGridName}>{tutor.name}</Text>
            <Text style={styles.tutorGridMeta}>{tutor.subjects.slice(0, 2).join(", ")}</Text>
            <Text style={styles.tutorGridMeta}>{tutor.location}</Text>
            <Text style={styles.tutorGridFooter}>{tutor.programs?.length ?? 0} programs • {tutor.batches.length} batches</Text>
          </Pressable>
        ))}
      </View>
      {!loading && !tutors.length ? <Muted>No tutors found. Try another subject or location.</Muted> : null}
      <Modal visible={filterOpen} transparent animationType="slide">
        <BlurView intensity={92} tint="dark" style={styles.filterModalBackdrop}>
          <View style={styles.filterModalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.filterModalTitle}>Find a tutor</Text>
              <Pressable onPress={() => setFilterOpen(false)}><Text style={styles.programModalCloseText}>×</Text></Pressable>
            </View>
            <View style={styles.filterTabs}>
              {(["core", "logistics", "profile"] as const).map((tab) => (
                <Pressable key={tab} style={[styles.filterTab, filterTab === tab && { backgroundColor: theme.text }]} onPress={() => setFilterTab(tab)}>
                  <Text style={[styles.filterTabText, filterTab === tab && { color: "#FFFFFF" }]}>{capitalize(tab)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterFieldStack}>{renderFilterFields()}</View>
            <Button role={role} label="Apply filters" disabled={!activeFilterCount} onPress={applyFilters} />
          </View>
        </BlurView>
      </Modal>
    </>
  );
}

function FilterDropdown({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (value: string) => void }) {
  return (
    <View style={styles.dropdownWrap}>
      <FieldLabel>{label}</FieldLabel>
      <DropdownField value={value} options={dedupe(options).length ? dedupe(options) : ["Any"]} onSelect={onSelect} />
    </View>
  );
}

function RoleHub({
  role,
  classes,
  requests,
  learnerProgress,
  loading,
  approveRequest,
  requestAction,
  actionLoading,
  back,
  tutorSupply,
  batchDraft,
  setBatchDraft,
  saveBatch,
  editBatch,
  archiveBatch,
  refreshSupply
}: {
  role: Role;
  classes: BatchClass[];
  requests: BatchRequestSummary[];
  learnerProgress: LearnerProgressSummary[];
  loading: boolean;
  approveRequest: (id: string) => void;
  requestAction: (id: string, action: "reject" | "defer" | "suggest" | "dismiss", suggestedBatchId?: string) => void;
  actionLoading: string | null;
  back: () => void;
  tutorSupply: TutorSupplyState | null;
  batchDraft: TutorBatchDraft;
  setBatchDraft: (value: TutorBatchDraft | ((draft: TutorBatchDraft) => TutorBatchDraft)) => void;
  saveBatch: () => void;
  editBatch: (batch: TutorBatchSummary) => void;
  archiveBatch: (batchId: string) => void;
  refreshSupply: () => void;
}) {
  const title = role === "tutor" ? "Tutor supply" : role === "student" ? "Classes" : "Child classes";
  const [selectedRosterClass, setSelectedRosterClass] = useState<BatchClass | null>(null);
  if (role === "tutor" && selectedRosterClass) {
    return <ClassRoster role={role} item={selectedRosterClass} learnerProgress={learnerProgress} back={() => setSelectedRosterClass(null)} />;
  }
  if (role === "student" && selectedRosterClass) {
    return <StudentClassDetail role={role} item={selectedRosterClass} requests={requests.filter((request) => request.batch.batchId === selectedRosterClass.batchId)} back={() => setSelectedRosterClass(null)} />;
  }
  if (role === "parent" && selectedRosterClass) {
    return <StudentClassDetail role={role} item={selectedRosterClass} requests={[]} back={() => setSelectedRosterClass(null)} />;
  }
  if (role === "student" || role === "parent") {
    return (
      <>
        <TopBar title={title} left="‹" onLeft={back} />
        {loading ? <ActivityIndicator /> : null}
        {classes.map((item) => <ClassTile key={item.id} role={role} item={item} onPress={() => setSelectedRosterClass(item)} actionLabel="View class" />)}
        {!loading && !classes.length ? <Card role={role}><CardTitle>{role === "parent" ? "No child classes yet" : "No classes yet"}</CardTitle><Muted>{role === "parent" ? "Approved classes for linked children will appear here." : "Requested batches will appear here after the tutor approves enrollment."}</Muted></Card> : null}
      </>
    );
  }
  if (role === "tutor") {
    return (
      <>
        <TopBar title={title} left="‹" onLeft={back} />
        {loading ? <ActivityIndicator /> : null}
        <TutorSupplyPanel
          role={role}
          supply={tutorSupply}
          batchDraft={batchDraft}
          setBatchDraft={setBatchDraft}
          saveBatch={saveBatch}
          editBatch={editBatch}
          archiveBatch={archiveBatch}
          actionLoading={actionLoading}
          refreshSupply={refreshSupply}
        />
        <SectionTitle>Batch requests</SectionTitle>
        {requests.map((request) => <BatchRequestCard key={request.id} role={role} request={request} approveRequest={approveRequest} requestAction={requestAction} actionLoading={actionLoading} />)}
        {!loading && !requests.length ? <Card role={role}><CardTitle>No student requests yet</CardTitle><Muted>Batch requests from students will appear here for approval.</Muted></Card> : null}
        <SectionTitle>Batch roster</SectionTitle>
        {classes.map((item) => <ClassTile key={item.id} role={role} item={item} onPress={() => setSelectedRosterClass(item)} actionLabel="View roster" />)}
        {!loading && !classes.length ? <Card role={role}><CardTitle>No active enrollments yet</CardTitle><Muted>Approved students will appear here by batch.</Muted></Card> : null}
      </>
    );
  }
  return (
    <>
      <TopBar title={title} left="‹" onLeft={back} />
      <Card role={role}><CardTitle>No surveys yet</CardTitle><Muted>Weekly progress surveys will appear here.</Muted></Card>
    </>
  );
}

function TutorSupplyPanel({
  role,
  supply,
  batchDraft,
  setBatchDraft,
  saveBatch,
  editBatch,
  archiveBatch,
  actionLoading,
  refreshSupply
}: {
  role: Role;
  supply: TutorSupplyState | null;
  batchDraft: TutorBatchDraft;
  setBatchDraft: (value: TutorBatchDraft | ((draft: TutorBatchDraft) => TutorBatchDraft)) => void;
  saveBatch: () => void;
  editBatch: (batch: TutorBatchSummary) => void;
  archiveBatch: (batchId: string) => void;
  actionLoading: string | null;
  refreshSupply: () => void;
}) {
  const programs = supply?.programs ?? [];
  const batches = supply?.batches ?? [];
  const analytics = supply?.analytics;
  const selectedProgram = programs.find((program) => program.id === batchDraft.programId);
  const updateDraft = (patch: Partial<TutorBatchDraft>) => setBatchDraft((draft) => ({ ...draft, ...patch }));
  return (
    <>
      <SectionTitle>Programs</SectionTitle>
      <View style={styles.supplyStatsRow}>
        <View style={styles.supplyStatCard}>
          <Text style={styles.supplyStatValue}>{analytics?.programs.total ?? programs.length}</Text>
          <Text style={styles.supplyStatLabel}>Programs</Text>
        </View>
        <View style={styles.supplyStatCard}>
          <Text style={styles.supplyStatValue}>{analytics?.batches.active ?? batches.filter((batch) => (batch.status ?? "available") !== "archived").length}</Text>
          <Text style={styles.supplyStatLabel}>Active batches</Text>
        </View>
      </View>
      {analytics ? (
        <View style={styles.supplyStatsRow}>
          <View style={styles.supplyStatCard}>
            <Text style={styles.supplyStatValue}>{analytics.requests.pending}</Text>
            <Text style={styles.supplyStatLabel}>Pending requests</Text>
          </View>
          <View style={styles.supplyStatCard}>
            <Text style={styles.supplyStatValue}>{analytics.enrollments.active}</Text>
            <Text style={styles.supplyStatLabel}>Active enrollments</Text>
          </View>
        </View>
      ) : null}
      {!programs.length ? (
        <Card role={role}><CardTitle>No programs yet</CardTitle><Muted>Create a draft program from Program, then attach batches here after it is ready for students.</Muted></Card>
      ) : null}

      <SectionTitle>Batch builder</SectionTitle>
      <View style={styles.supplyBuilderCard}>
        <FieldLabel>Program</FieldLabel>
        <DropdownField
          value={selectedProgram?.title ?? "Select program"}
          options={programs.map((program) => program.title)}
          onSelect={(title) => {
            const program = programs.find((item) => item.title === title);
            updateDraft({ programId: program?.id ?? "", course: program?.title ?? batchDraft.course });
          }}
        />
        <FieldLabel>Batch title</FieldLabel>
        <Input value={batchDraft.title} onChangeText={(value) => updateDraft({ title: value })} placeholder="Weekend foundation batch" />
        <View style={styles.twoColumn}>
          <View style={styles.fieldColumn}>
            <FieldLabel>Subject</FieldLabel>
            <Input value={batchDraft.subject} onChangeText={(value) => updateDraft({ subject: value })} placeholder="Mathematics" />
          </View>
          <View style={styles.fieldColumn}>
            <FieldLabel>Capacity</FieldLabel>
            <Input value={batchDraft.capacity} onChangeText={(value) => updateDraft({ capacity: value.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="20" />
          </View>
        </View>
        <View style={styles.twoColumn}>
          <View style={styles.fieldColumn}>
            <FieldLabel>Grade</FieldLabel>
            <Input value={batchDraft.grade} onChangeText={(value) => updateDraft({ grade: value })} placeholder="Class 10" />
          </View>
          <View style={styles.fieldColumn}>
            <FieldLabel>Board</FieldLabel>
            <Input value={batchDraft.board} onChangeText={(value) => updateDraft({ board: value })} placeholder="CBSE" />
          </View>
        </View>
        <FieldLabel>Schedule</FieldLabel>
        <Input value={batchDraft.schedule} onChangeText={(value) => updateDraft({ schedule: value })} placeholder="Sat-Sun • 6:00 pm" />
        <FieldLabel>Start date/time</FieldLabel>
        <Input value={batchDraft.startsAt} onChangeText={(value) => updateDraft({ startsAt: value })} placeholder="2026-08-01T13:30:00.000Z" />
        <View style={styles.twoColumn}>
          <View style={styles.fieldColumn}>
            <FieldLabel>Mode</FieldLabel>
            <DropdownField value={batchDraft.mode} options={["online", "offline", "hybrid"]} onSelect={(value) => updateDraft({ mode: value })} />
          </View>
          <View style={styles.fieldColumn}>
            <FieldLabel>Status</FieldLabel>
            <DropdownField value={batchDraft.status} options={["available", "filling_fast", "booked"]} onSelect={(value) => updateDraft({ status: value })} />
          </View>
        </View>
        <FieldLabel>Classroom location</FieldLabel>
        <Input value={batchDraft.classroomLocation} onChangeText={(value) => updateDraft({ classroomLocation: value })} placeholder="Koramangala centre or home classroom" />
        <FieldLabel>Online link</FieldLabel>
        <Input value={batchDraft.onlineLink} onChangeText={(value) => updateDraft({ onlineLink: value })} placeholder="https://meet.google.com/..." />
        <View style={styles.twoColumn}>
          <View style={styles.fieldColumn}>
            <FieldLabel>Fee type</FieldLabel>
            <DropdownField value={batchDraft.feeType} options={["free", "paid"]} onSelect={(value) => updateDraft({ feeType: value })} />
          </View>
          <View style={styles.fieldColumn}>
            <FieldLabel>Fee amount</FieldLabel>
            <Input value={batchDraft.feeAmount} onChangeText={(value) => updateDraft({ feeAmount: value.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="0" />
          </View>
        </View>
        <View style={styles.supplyActionRow}>
          <Button role={role} label={batchDraft.id ? "Update batch" : "Create batch"} onPress={saveBatch} loading={actionLoading === "saveTutorBatch"} disabled={!batchDraft.title.trim() || !batchDraft.schedule.trim() || !programs.length} />
          <Button role={role} variant="secondary" label="New batch" onPress={() => setBatchDraft({ ...defaultTutorBatchDraft, programId: programs[0]?.id ?? "", course: programs[0]?.title ?? "" })} />
        </View>
      </View>

      <SectionTitle>Batches</SectionTitle>
      {batches.map((batch) => (
        <View key={batch.id} style={styles.supplyBatchCard}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.batchTitle}>{batch.title}</Text>
              <Text style={styles.batchMeta}>{batch.course} • {batch.mode} • {batch.schedule}</Text>
              <Text style={styles.batchMeta}>{capitalize(batch.status ?? "available")} • {batch.fillPercent ?? 0}% filled • {batch.enrolledCount}/{batch.capacity}</Text>
              <Text style={styles.batchMeta}>{batch.feeType === "paid" ? `₹${batch.feeAmount ?? 0}` : "Free"} • Starts {formatReminderDateTime(batch.startsAt)}</Text>
            </View>
          </View>
          <View style={styles.supplyActionRow}>
            <Button role={role} variant="secondary" label="Edit" onPress={() => editBatch(batch)} />
            <Button role={role} variant="secondary" label="Archive" onPress={() => archiveBatch(batch.id)} loading={actionLoading === "archiveTutorBatch:" + batch.id} />
          </View>
        </View>
      ))}
      {!batches.length ? <Card role={role}><CardTitle>No batches yet</CardTitle><Muted>Create a batch so students can request admission from tutor discovery.</Muted></Card> : null}
      <Button role={role} variant="secondary" label="Refresh supply" onPress={refreshSupply} />
    </>
  );
}

function ClassTile({ role, item, onPress, actionLabel }: { role: Role; item: BatchClass; onPress?: () => void; actionLabel?: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.classTile, pressed && styles.pressablePressed]} onPress={onPress} disabled={!onPress}>
      <Text style={styles.classTitle}>{item.title}</Text>
      <Text style={styles.classMeta}>{item.course} • {item.board} • {item.grade}</Text>
      <Text style={styles.classMeta}>{item.schedule} • {formatReminderDateTime(item.startsAt)}</Text>
      <Text style={styles.classMeta}>Tutor: {item.tutorName} • ★ {item.tutorRating}</Text>
      <Text style={styles.classMeta}>Classroom: {item.classroomLocation ?? "Online"}</Text>
      {item.enrolledStudents?.length ? <Text style={styles.classMeta}>Students: {item.enrolledStudents.map((student) => student.name).join(", ")}</Text> : null}
      {typeof item.pendingRequests === "number" ? <Text style={styles.classMeta}>Pending requests: {item.pendingRequests}</Text> : null}
      {item.onlineVideoLink ? <Text style={styles.classLink}>{item.onlineVideoLink}</Text> : <Text style={styles.classLocked}>Video link unlocks 5 minutes before class.</Text>}
      {onPress ? <Text style={styles.classActionText}>{actionLabel ?? "View details"}</Text> : null}
    </Pressable>
  );
}

function StudentClassDetail({ role, item, requests, back }: { role: Role; item: BatchClass; requests: BatchRequestSummary[]; back: () => void }) {
  const classmates = item.enrolledStudents ?? [];
  return (
    <>
      <TopBar title="Class details" left="‹" onLeft={back} />
      <View style={styles.classRosterHero}>
        <Text style={styles.classTitle}>{item.title}</Text>
        <Text style={styles.classMeta}>{item.course} • {item.subject} • {item.board} • {item.grade}</Text>
        <Text style={styles.classMeta}>{item.schedule} • {formatReminderDateTime(item.startsAt)}</Text>
        <Text style={styles.classMeta}>Tutor: {item.tutorName} • ★ {item.tutorRating}</Text>
        {item.tutorHeadline ? <Text style={styles.classMeta}>{item.tutorHeadline}</Text> : null}
      </View>
      <SectionTitle>{role === "parent" ? "Class visibility" : "Joining details"}</SectionTitle>
      <Card role={role}>
        <CardTitle>{item.mode === "online" ? "Online class" : item.mode === "offline" ? "Classroom" : "Hybrid class"}</CardTitle>
        <Muted>{item.classroomLocation ?? "Online session"}</Muted>
        {role === "parent" ? <Text style={styles.classLocked}>Parent view only. Joining actions stay with the student account.</Text> : item.onlineVideoLink ? <Text style={styles.classLink}>{item.onlineVideoLink}</Text> : <Text style={styles.classLocked}>Video link unlocks 5 minutes before class.</Text>}
      </Card>
      <SectionTitle>Classmates</SectionTitle>
      {classmates.map((student) => (
        <View key={student.id} style={styles.rosterStudentRow}>
          <View style={styles.rosterAvatar}>
            <Text style={styles.rosterAvatarText}>{compactInitials(student.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.parentRowName}>{student.name}</Text>
            <Text style={styles.parentRowMeta}>{student.city ?? "City not added"}</Text>
          </View>
        </View>
      ))}
      {!classmates.length ? <Card role={role}><CardTitle>No classmates listed yet</CardTitle><Muted>Roster details will appear after enrollments are synced.</Muted></Card> : null}
      {requests.length ? (
        <>
          <SectionTitle>Request history</SectionTitle>
          {requests.map((request) => (
            <View key={request.id} style={styles.batchAlertCard}>
              <Text style={styles.batchTitle}>{capitalize(request.status)}</Text>
              <Text style={styles.batchMeta}>{request.tutorResponse ?? request.message ?? "Enrollment request recorded."}</Text>
              {request.timeline?.length ? (
                <View style={styles.requestTimeline}>
                  {request.timeline.map((step) => (
                    <View key={step.key} style={styles.timelineStep}>
                      <View style={[styles.timelineDot, step.status === "complete" && styles.timelineDotDone, step.status === "current" && styles.timelineDotCurrent]} />
                      <Text style={[styles.timelineText, step.status === "current" && styles.timelineTextCurrent]}>{step.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </>
  );
}

function ClassRoster({ role, item, learnerProgress, back }: { role: Role; item: BatchClass; learnerProgress: LearnerProgressSummary[]; back: () => void }) {
  const students = item.enrolledStudents ?? [];
  return (
    <>
      <TopBar title="Batch roster" left="‹" onLeft={back} />
      <View style={styles.classRosterHero}>
        <Text style={styles.classTitle}>{item.title}</Text>
        <Text style={styles.classMeta}>{item.course} • {item.board} • {item.grade}</Text>
        <Text style={styles.classMeta}>{item.schedule} • {formatReminderDateTime(item.startsAt)}</Text>
        <Text style={styles.classMeta}>{item.mode} • {item.classroomLocation ?? "Online"}</Text>
        {typeof item.pendingRequests === "number" ? <Text style={styles.classRosterCount}>{students.length} enrolled • {item.pendingRequests} pending</Text> : <Text style={styles.classRosterCount}>{students.length} enrolled</Text>}
      </View>
      <SectionTitle>Students</SectionTitle>
      {students.map((student) => (
        <View key={student.id} style={styles.rosterStudentCard}>
          <View style={styles.rosterStudentRowInner}>
            <View style={styles.rosterAvatar}>
              <Text style={styles.rosterAvatarText}>{compactInitials(student.name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.parentRowName}>{student.name}</Text>
              <Text style={styles.parentRowMeta}>{student.city ?? "City not added"}</Text>
            </View>
          </View>
          {(learnerProgress.find((summary) => summary.profileId === student.id)?.programs ?? []).slice(0, 2).map((program) => (
            <View key={program.programId} style={styles.learnerProgressBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.learnerProgressTitle}>{program.title}</Text>
                <Text style={styles.learnerProgressPercent}>{program.percent}%</Text>
              </View>
              <View style={styles.learnerProgressTrack}><View style={[styles.learnerProgressFill, { width: (String(Math.max(4, program.percent)) + "%") as `${number}%` }]} /></View>
              <Text style={styles.parentRowMeta}>{program.completedActivities}/{program.totalActivities} activities{program.latestQuizPercent !== null && program.latestQuizPercent !== undefined ? ` • Latest quiz ${program.latestQuizPercent}%` : ""}</Text>
            </View>
          ))}
        </View>
      ))}
      {!students.length ? <Card role={role}><CardTitle>No students enrolled</CardTitle><Muted>Once a batch request is approved, the student will appear in this roster.</Muted></Card> : null}
      {item.onlineVideoLink ? <Card role={role}><CardTitle>Class link</CardTitle><Text style={styles.classLink}>{item.onlineVideoLink}</Text></Card> : null}
    </>
  );
}

function BatchRequestCard({ role, request, approveRequest, requestAction, actionLoading }: { role: Role; request: BatchRequestSummary; approveRequest: (id: string) => void; requestAction: (id: string, action: "reject" | "defer" | "suggest" | "dismiss", suggestedBatchId?: string) => void; actionLoading: string | null }) {
  return (
    <View style={styles.batchRequestCard}>
      <CardTitle>{request.student.name}</CardTitle>
      <Muted>{request.batch.title} • {request.batch.schedule}</Muted>
      <Muted>Status: {capitalize(request.status)}{request.tutorResponse ? " • " + request.tutorResponse : ""}</Muted>
      {request.status === "pending" ? (
        <View style={styles.requestActionGrid}>
          <Button role={role} label="Approve" loading={actionLoading === "approveRequest:" + request.id} onPress={() => approveRequest(request.id)} />
          <Button role={role} variant="secondary" label="Deny" loading={actionLoading === "rejectRequest:" + request.id} onPress={() => requestAction(request.id, "reject")} />
          <Button role={role} variant="secondary" label="Defer" loading={actionLoading === "deferRequest:" + request.id} onPress={() => requestAction(request.id, "defer")} />
          <Button role={role} variant="secondary" label="Suggest another" loading={actionLoading === "suggestRequest:" + request.id} onPress={() => requestAction(request.id, "suggest", request.batch.batchId)} />
        </View>
      ) : null}
    </View>
  );
}

function StudentBatchRequestAlerts({ role, requests, openTutorSearch, acceptSuggestion, withdrawRequest, dismiss, actionLoading }: { role: Role; requests: BatchRequestSummary[]; openTutorSearch: () => void; acceptSuggestion: (id: string) => void; withdrawRequest: (id: string) => void; dismiss: (id: string) => void; actionLoading: string | null }) {
  const visible = requests.filter((request) => ["pending", "rejected", "deferred", "suggested", "cancelled"].includes(request.status));
  if (!visible.length) return null;
  return (
    <>
      <SectionTitle>Batch updates</SectionTitle>
      {visible.map((request) => (
        <View key={request.id} style={styles.batchAlertCard}>
          {request.status === "pending" ? null : <Pressable style={styles.alertClose} onPress={() => dismiss(request.id)}><Text style={styles.alertCloseText}>×</Text></Pressable>}
          <Text style={styles.batchTitle}>{request.batch.title}</Text>
          <Text style={styles.batchMeta}>{capitalize(request.status)} by {request.tutor.name}</Text>
          <Text style={styles.batchMeta}>{request.tutorResponse ?? "Please choose your next action."}</Text>
          {request.suggestedBatch ? (
            <View style={styles.suggestedBatchBox}>
              <Text style={styles.suggestedBatchLabel}>Suggested batch</Text>
              <Text style={styles.batchTitle}>{request.suggestedBatch.title}</Text>
              <Text style={styles.batchMeta}>{request.suggestedBatch.course} • {request.suggestedBatch.schedule}</Text>
              <Text style={styles.batchMeta}>{request.suggestedBatch.mode}{request.suggestedBatch.classroomLocation ? " • " + request.suggestedBatch.classroomLocation : ""}</Text>
            </View>
          ) : null}
          {request.timeline?.length ? (
            <View style={styles.requestTimeline}>
              {request.timeline.map((step) => (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={[styles.timelineDot, step.status === "complete" && styles.timelineDotDone, step.status === "current" && styles.timelineDotCurrent]} />
                  <Text style={[styles.timelineText, step.status === "current" && styles.timelineTextCurrent]}>{step.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {request.status === "suggested" ? (
            <View style={styles.requestActionGrid}>
              <Button role={role} label="Accept suggested batch" loading={actionLoading === "acceptSuggestion:" + request.id} onPress={() => acceptSuggestion(request.id)} />
              <Button role={role} variant="secondary" label="View tutor batches" onPress={openTutorSearch} />
            </View>
          ) : null}
          {request.status === "pending" ? (
            <View style={styles.requestActionGrid}>
              <Button role={role} variant="secondary" label="Withdraw request" loading={actionLoading === "withdrawRequest:" + request.id} onPress={() => withdrawRequest(request.id)} />
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

function Events({
  role,
  reminders,
  connectedPeopleByReminder,
  editReminder,
  deleteReminder,
  back,
  title,
  date,
  time,
  setTitle,
  setDate,
  setTime,
  connectedPeople,
  setConnectedPeople,
  openDatePicker,
  openTimePicker,
  createReminder,
  loading
}: {
  role: Role;
  reminders: Reminder[];
  connectedPeopleByReminder: Record<string, string>;
  editReminder: (item: Reminder) => void;
  deleteReminder: (id: string) => void;
  back: () => void;
  title: string;
  date: string;
  time: string;
  setTitle: (value: string) => void;
  setDate: (value: string) => void;
  setTime: (value: string) => void;
  connectedPeople: string;
  setConnectedPeople: (value: string) => void;
  openDatePicker: () => void;
  openTimePicker: () => void;
  createReminder: () => void;
  loading: boolean;
}) {
  return (
    <>
      <TopBar title="Events & reminders" left="‹" onLeft={back} />
      <ReminderComposer
        role={role}
        title={title}
        date={date}
        time={time}
        setTitle={setTitle}
        setDate={setDate}
        setTime={setTime}
        openDatePicker={openDatePicker}
        openTimePicker={openTimePicker}
        onCreate={createReminder}
        loading={loading}
      />
      <FieldLabel>Connected people</FieldLabel>
      <TextInput
        value={connectedPeople}
        onChangeText={setConnectedPeople}
        placeholder="Parent, tutor, student, or guardian names"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
      {reminders.length ? reminders.map((item) => (
        <SwipeReminderRow
          key={item.id}
          role={role}
          reminder={item}
          connectedPeople={connectedPeopleByReminder[item.id]}
          onEdit={() => editReminder(item)}
          onDelete={() => deleteReminder(item.id)}
        />
      )) : <Muted>No reminders yet.</Muted>}
    </>
  );
}

function Payments({ role, accessToken, back }: { role: Role; accessToken?: string; back: () => void }) {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [orders, setOrders] = useState<PaymentOrderSummary[]>([]);
  const [accounting, setAccounting] = useState<TutorAccountingSummary[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let ignore = false;
    async function loadPayments() {
      try {
        const [methodResponse, orderResponse] = await Promise.all([
          apiGet<{ data: PaymentMethodConfig[] }>("/api/v1/payments/methods", accessToken),
          accessToken ? apiGet<{ data: { orders: PaymentOrderSummary[]; accounting: TutorAccountingSummary[] } }>(`/api/v1/payments/orders?role=${role}`, accessToken) : Promise.resolve({ data: { orders: [], accounting: [] } })
        ]);
        if (ignore) return;
        setMethods(methodResponse.data);
        setOrders(orderResponse.data.orders);
        setAccounting(orderResponse.data.accounting);
        setNotice("");
      } catch {
        if (!ignore) setNotice("Payments could not be loaded from API.");
      }
    }
    loadPayments();
    return () => { ignore = true; };
  }, [accessToken, role]);
  return (
    <>
      <TopBar title="Payments" left="‹" onLeft={back} />
      {notice ? <Text style={styles.apiNotice}>{notice}</Text> : null}
      <SectionTitle>Payment methods</SectionTitle>
      {methods.map((method) => (
        <Card key={method.id} role={role}>
          <CardTitle>{method.label}</CardTitle>
          <Muted>{method.type.toUpperCase()} • {method.enabled ? "Enabled" : "Disabled"}</Muted>
        </Card>
      ))}
      <SectionTitle>Orders</SectionTitle>
      {orders.length ? orders.map((order) => (
        <Card key={order.id} role={role}>
          <CardTitle>{order.targetType.replace("_", " ")} • ₹{order.amount}</CardTitle>
          <Muted>{order.status} • {order.gatewayProvider} • {order.methodType ?? "method pending"}</Muted>
        </Card>
      )) : <Card role={role}><CardTitle>No payment orders</CardTitle><Muted>Paid programs and batches will appear here.</Muted></Card>}
      {role === "tutor" ? (
        <>
          <SectionTitle>Payout-ready accounting</SectionTitle>
          {accounting.length ? accounting.map((item) => (
            <Card key={item.id} role={role}>
              <CardTitle>Net ₹{item.netAmount}</CardTitle>
              <Muted>Gross ₹{item.grossAmount} • Fee ₹{item.platformFee} • {item.status}</Muted>
            </Card>
          )) : <Card role={role}><CardTitle>No accounting entries</CardTitle><Muted>Paid enrollments and purchases will create tutor payout entries.</Muted></Card>}
        </>
      ) : null}
    </>
  );
}

type DoubtItem = {
  id: string;
  author: string;
  initials: string;
  time: string;
  title: string;
  body: string;
  status: "solved" | "open";
  votes: number;
  replies: number;
  pinned?: boolean;
  anonymous?: boolean;
  attachment?: boolean;
  verified?: boolean;
  visibility?: string;
  reportCount?: number;
  moderatedStatus?: string;
  canComment?: boolean;
  canReport?: boolean;
  comments?: CommunityComment[];
};

const doubtItems: DoubtItem[] = [
  {
    id: "pinned",
    author: "Prof. Verma",
    initials: "PV",
    time: "Essential Exam Target",
    title: "[5-Mark Blueprint] Gauss's Law derivation",
    body: "How to derive electric field intensity due to an infinitely long straight uniformly charged wire using Gauss's Law?",
    status: "solved",
    votes: 142,
    replies: 1,
    pinned: true,
    verified: true
  },
  {
    id: "peer1",
    author: "Aman Kapoor",
    initials: "AK",
    time: "12 mins ago",
    title: "Choosing a Gaussian surface",
    body: "Stuck on Quiz Question 4. Why do we assume the Gaussian surface to be cylindrical for a linear line charge? Why not a spherical one?",
    status: "solved",
    votes: 18,
    replies: 3,
    attachment: true
  },
  {
    id: "peer2",
    author: "Anonymous Peer",
    initials: "AP",
    time: "2 hours ago",
    title: "Flux angle confusion",
    body: "In the formula Phi = integral E dot dA, is the angle always evaluated between the field vector and surface normal vector?",
    status: "open",
    votes: 7,
    replies: 0,
    anonymous: true
  }
];

function communityThreadToDoubt(thread: CommunityThread): DoubtItem {
  return {
    id: thread.id,
    author: thread.author.name,
    initials: thread.author.initials,
    time: relativeTime(thread.createdAt),
    title: thread.title,
    body: thread.body,
    status: thread.status === "solved" ? "solved" : "open",
    votes: thread.reactionCounts.upvote + thread.reactionCounts.helpful + thread.reactionCounts.like,
    replies: thread.commentCount,
    pinned: thread.pinned,
    anonymous: thread.anonymous,
    attachment: !!thread.attachmentUrl,
    verified: thread.comments?.some((comment) => comment.verified),
    visibility: thread.visibility,
    reportCount: thread.reportCount,
    moderatedStatus: thread.moderatedStatus,
    canComment: thread.canComment,
    canReport: thread.canReport,
    comments: thread.comments
  };
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function Chat({ role, accessToken, back }: { role: Role; accessToken?: string; back: () => void }) {
  const theme = useRoleTheme(role);
  const [filter, setFilter] = useState<"all" | "open" | "solved">("all");
  const [search, setSearch] = useState("");
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtItem | null>(null);
  const [asking, setAsking] = useState(false);
  const [newDoubt, setNewDoubt] = useState("");
  const [replyText, setReplyText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [apiDoubts, setApiDoubts] = useState<DoubtItem[] | null>(null);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtNotice, setDoubtNotice] = useState("");
  const readOnly = role === "parent";
  const allDoubts = apiDoubts ?? (readOnly ? [] : doubtItems);
  const filteredDoubts = allDoubts.filter((item) => {
    const statusMatch = filter === "all" || item.status === filter;
    const text = `${item.title} ${item.body} ${item.author}`.toLowerCase();
    return statusMatch && text.includes(search.trim().toLowerCase());
  });
  const pinned = filteredDoubts.filter((item) => item.pinned);
  const peerDoubts = filteredDoubts.filter((item) => !item.pinned);

  async function refreshDoubts() {
    setDoubtLoading(true);
    try {
      const response = await apiGet<{ data: CommunityThread[] }>(`/api/v1/community/threads?role=${role}`, accessToken);
      const apiItems = response.data.map(communityThreadToDoubt);
      setApiDoubts(apiItems.length || readOnly ? apiItems : null);
      setDoubtNotice("");
    } catch {
      setDoubtNotice(readOnly ? "Child community threads could not be loaded from API." : "Using local doubts until community API is available.");
      setApiDoubts(readOnly ? [] : null);
    } finally {
      setDoubtLoading(false);
    }
  }

  async function openDoubt(item: DoubtItem) {
    setSelectedDoubt(item);
    try {
      const response = await apiGet<{ data: CommunityThread }>(`/api/v1/community/threads/${item.id}?role=${role}`, accessToken);
      setSelectedDoubt(communityThreadToDoubt(response.data));
      setDoubtNotice("");
    } catch {
      setDoubtNotice(apiDoubts ? "Thread details could not be refreshed." : "");
    }
  }

  async function submitDoubt() {
    if (readOnly) return;
    const body = newDoubt.trim();
    if (!body) return;
    const title = body.length > 64 ? `${body.slice(0, 61)}...` : body;
    try {
      const response = await apiPost<{ data: CommunityThread }>("/api/v1/community/threads", {
        role,
        title,
        body,
        subject: "Physics",
        milestoneTitle: "Milestone 3: Gauss's Law",
        anonymous
      }, accessToken);
      const next = communityThreadToDoubt(response.data);
      setApiDoubts((items) => [next, ...(items ?? doubtItems)]);
      setNewDoubt("");
      setAnonymous(false);
      setAsking(false);
      setDoubtNotice("");
    } catch {
      setDoubtNotice("Please sign in again to post a doubt.");
    }
  }

  async function submitReply() {
    if (readOnly || selectedDoubt?.canComment === false) return;
    if (!selectedDoubt || !replyText.trim()) return;
    try {
      await apiPost<{ data: CommunityComment }>(`/api/v1/community/threads/${selectedDoubt.id}/comments`, {
        role,
        body: replyText.trim()
      }, accessToken);
      setReplyText("");
      await openDoubt(selectedDoubt);
      await refreshDoubts();
    } catch {
      setDoubtNotice("Reply could not be posted. Please check login/API.");
    }
  }

  async function reportThread(item: DoubtItem) {
    if (!item.canReport) return;
    try {
      await apiPost("/api/v1/community/reports", {
        role,
        threadId: item.id,
        reason: "inappropriate",
        details: "Reported from mobile community detail."
      }, accessToken);
      setDoubtNotice("Thanks. This thread has been sent for review.");
      await openDoubt(item);
    } catch {
      setDoubtNotice("Report could not be submitted. Please check login/API.");
    }
  }

  useEffect(() => {
    refreshDoubts();
  }, [role, accessToken]);

  if (asking && !readOnly) {
    return (
      <View style={styles.doubtScreen}>
        <DoubtHeader title="Create Doubt" subtitle="Board forum • Physics" back={() => setAsking(false)} />
        <View style={styles.askDoubtCard}>
          <Title>Post a new doubt</Title>
          <Muted>Describe the exact step, formula, or question where you are stuck.</Muted>
          <FieldLabel>What are you struggling with?</FieldLabel>
          <TextInput
            value={newDoubt}
            onChangeText={setNewDoubt}
            multiline
            placeholder="Type your equation, query, or question context here..."
            placeholderTextColor="#8D7BA0"
            style={styles.askDoubtInput}
          />
          <FieldLabel>Attach photo of the problem</FieldLabel>
          <Pressable style={({ pressed }) => [styles.attachmentUploader, pressed && styles.pressed]}>
            <Text style={styles.attachmentIcon}>▧</Text>
            <Text style={[styles.attachmentText, { color: theme.text }]}>Upload photo or screenshot</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.anonymousToggle, pressed && styles.pressed]} onPress={() => setAnonymous(!anonymous)}>
            <View>
              <Text style={styles.anonymousTitle}>Hide my identity</Text>
              <Text style={styles.anonymousCopy}>Display as Anonymous to peers</Text>
            </View>
            <View style={[styles.consentCheck, anonymous && { backgroundColor: theme.accentStrong, borderColor: theme.accentStrong }]}>
              <Text style={styles.consentCheckText}>{anonymous ? "✓" : ""}</Text>
            </View>
          </Pressable>
          {doubtNotice ? <Text style={styles.apiNotice}>{doubtNotice}</Text> : null}
          <Button role={role} label="Submit to board forum" disabled={!newDoubt.trim()} onPress={submitDoubt} />
        </View>
      </View>
    );
  }

  if (selectedDoubt) {
    return (
      <View style={styles.doubtScreen}>
        <DoubtHeader title="Doubt Details" subtitle="Physics • Milestone 3" back={() => setSelectedDoubt(null)} />
        <View style={styles.doubtDetailCard}>
          <View style={styles.doubtCardHeader}>
            <View style={styles.doubtUserRow}>
              <View style={[styles.doubtAvatar, selectedDoubt.anonymous && styles.doubtAvatarMuted]}>
                <Text style={styles.doubtAvatarText}>{selectedDoubt.initials}</Text>
              </View>
              <View>
                <Text style={styles.doubtUserName}>{selectedDoubt.author}</Text>
                <Text style={styles.doubtTime}>{selectedDoubt.time}</Text>
              </View>
            </View>
            <DoubtStatus status={selectedDoubt.status} />
          </View>
          <Text style={styles.doubtDetailTitle}>{selectedDoubt.title}</Text>
          <Text style={styles.doubtScopeText}>{selectedDoubt.visibility === "batch" ? "Batch discussion" : selectedDoubt.visibility === "program" ? "Program discussion" : "Community discussion"}{selectedDoubt.reportCount ? ` • ${selectedDoubt.reportCount} report${selectedDoubt.reportCount === 1 ? "" : "s"}` : ""}</Text>
          <Text style={styles.doubtDetailBody}>{selectedDoubt.body}</Text>
          {selectedDoubt.moderatedStatus && selectedDoubt.moderatedStatus !== "active" ? <Text style={styles.doubtModerationText}>This thread is under moderation review.</Text> : null}
          {selectedDoubt.verified ? (
            <View style={styles.teacherSolutionBox}>
              <Text style={styles.teacherBadge}>TEACHER VERIFIED SOLUTION</Text>
              <Text style={styles.teacherSolutionText}>
                Use a cylindrical Gaussian surface because it matches the symmetry of a line charge. The field is constant on the curved surface and perpendicular to the end caps, so the cap flux is zero and only the curved area contributes.
              </Text>
              <Text style={styles.formulaBox}>E = lambda / (2 pi epsilon0 r)</Text>
            </View>
          ) : selectedDoubt.comments?.length ? (
            selectedDoubt.comments.map((comment) => (
              <View key={comment.id} style={styles.communityAnswerCard}>
                <Text style={styles.peerTutorLabel}>{comment.verified ? "Tutor verified" : comment.author.name}</Text>
                <Text style={styles.teacherSolutionText}>{comment.body}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noAnswerCard}>
              <Text style={styles.noAnswerTitle}>No answers yet</Text>
              <Muted>Be the first to help your peer.</Muted>
            </View>
          )}
        </View>
        <View style={styles.communityDetailActions}>
          {selectedDoubt.canReport ? (
            <Pressable style={({ pressed }) => [styles.communityReportButton, pressed && styles.pressed]} onPress={() => reportThread(selectedDoubt)}>
              <Text style={styles.communityReportText}>Report</Text>
            </Pressable>
          ) : null}
        </View>
        {!readOnly && selectedDoubt.canComment !== false ? (
          <View style={styles.replyBar}>
            <Text style={[styles.replyAttach, { color: theme.text }]}>▧</Text>
            <TextInput value={replyText} onChangeText={setReplyText} placeholder="Type your helpful reply..." placeholderTextColor="#8D7BA0" style={styles.replyInput} />
            <Pressable style={({ pressed }) => [styles.replySend, { backgroundColor: theme.text }, pressed && styles.pressed]} onPress={submitReply}>
              <Text style={styles.replySendText}>›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.doubtScreen}>
      <View style={styles.doubtSearchBox}>
        <View style={styles.doubtSearchBar}>
          <Text style={styles.doubtSearchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search doubts about Gauss's Law..."
            placeholderTextColor="#8D7BA0"
            style={styles.doubtSearchInput}
          />
        </View>
        <View style={styles.doubtFilterRow}>
          {[
            ["all", "All Doubts"],
            ["open", "Unsolved"],
            ["solved", "Solved"]
          ].map(([id, label]) => (
            <Pressable key={id} style={({ pressed }) => [styles.doubtChip, filter === id && { backgroundColor: theme.text }, pressed && styles.pressed]} onPress={() => setFilter(id as "all" | "open" | "solved")}>
              <Text style={[styles.doubtChipText, filter === id && styles.doubtChipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {doubtNotice ? <Text style={styles.apiNotice}>{doubtNotice}</Text> : null}
        {doubtLoading ? <ActivityIndicator color={theme.text} /> : null}
      </View>
      <View style={styles.doubtFeed}>
        {pinned.length ? <Text style={styles.doubtSectionLabel}>PINNED FAQ</Text> : null}
        {pinned.map((item) => <DoubtCard key={item.id} role={role} item={item} onPress={() => openDoubt(item)} />)}
        <Text style={styles.doubtSectionLabel}>{readOnly ? "CHILD THREADS" : "PEER DISCUSSIONS"}</Text>
        {peerDoubts.length ? peerDoubts.map((item) => <DoubtCard key={item.id} role={role} item={item} onPress={() => openDoubt(item)} />) : <Muted>{readOnly ? "No child community threads found." : "No matching doubts found."}</Muted>}
      </View>
      {!readOnly ? (
        <Pressable style={({ pressed }) => [styles.askFab, { backgroundColor: theme.text }, pressed && styles.pressed]} onPress={() => setAsking(true)}>
          <Text style={styles.askFabText}>+ Ask a Doubt</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DoubtHeader({ title, subtitle, back }: { title: string; subtitle: string; back: () => void }) {
  return (
    <View style={styles.doubtHeader}>
      <Pressable style={({ pressed }) => [styles.doubtBackButton, pressed && styles.pressed]} onPress={back}>
        <Text style={styles.doubtBackText}>‹</Text>
      </Pressable>
      <View style={styles.flex}>
        <Text style={styles.doubtHeaderTitle}>{title}</Text>
        <Text style={styles.doubtHeaderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function DoubtStatus({ status }: { status: "solved" | "open" }) {
  return (
    <View style={[styles.doubtStatus, status === "solved" ? styles.doubtSolved : styles.doubtOpen]}>
      <Text style={[styles.doubtStatusText, status === "solved" ? styles.doubtSolvedText : styles.doubtOpenText]}>{status === "solved" ? "Solved" : "Open"}</Text>
    </View>
  );
}

function DoubtCard({ role, item, onPress }: { role: Role; item: DoubtItem; onPress: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable style={({ pressed }) => [styles.doubtCard, item.pinned && styles.doubtCardPinned, item.pinned && { borderLeftColor: theme.text }, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.doubtCardHeader}>
        <View style={styles.doubtUserRow}>
          <View style={[styles.doubtAvatar, item.anonymous && styles.doubtAvatarMuted]}>
            <Text style={styles.doubtAvatarText}>{item.initials}</Text>
          </View>
          <View>
            <Text style={styles.doubtUserName}>{item.author} {item.verified ? <Text style={styles.inlineTeacherBadge}>Tutor</Text> : null}</Text>
            <Text style={styles.doubtTime}>{item.time}</Text>
          </View>
        </View>
        <DoubtStatus status={item.status} />
      </View>
      <View style={styles.doubtCardBody}>
        <View style={styles.flex}>
          <Text style={styles.doubtCardTitle}>{item.title}</Text>
          <Text style={styles.doubtCardText}>{item.body}</Text>
        </View>
        {item.attachment ? <View style={styles.doubtAttachment}><Text style={styles.doubtAttachmentText}>IMG</Text></View> : null}
      </View>
      <View style={styles.doubtCardFooter}>
        <Text style={[styles.doubtInteraction, item.pinned && { color: theme.text }]}>↑ {item.votes}</Text>
        <Text style={styles.doubtInteraction}>{item.replies} {item.replies === 1 ? "Solution" : "Replies"}</Text>
      </View>
    </Pressable>
  );
}

function Account({
  role,
  persona,
  avatarUri,
  signOut,
  setScreen,
  onEditProfile,
  requests,
  approveRequest,
  requestAction,
  actionLoading,
  generateActivationCode,
  activationCode,
  activationSeconds,
  activationRelationship,
  setActivationRelationship,
  parents
}: {
  role: Role;
  persona: typeof personas[Role];
  avatarUri: string | null;
  signOut: () => void;
  setScreen: (screen: AppScreen) => void;
  onEditProfile: () => void;
  requests: BatchRequestSummary[];
  approveRequest: (id: string) => void;
  requestAction: (id: string, action: "reject" | "defer" | "suggest" | "dismiss", suggestedBatchId?: string) => void;
  actionLoading: string | null;
  generateActivationCode: () => void;
  activationCode: string;
  activationSeconds: number;
  activationRelationship: string;
  setActivationRelationship: (value: string) => void;
  parents: ParentLink[];
}) {
  const theme = useRoleTheme(role);
  return (
    <>
      <View style={styles.accountHeader}>
        <Text style={styles.accountTitle}>My Account</Text>
        <View style={styles.milesHeaderSpacer} />
      </View>
      <View style={styles.accountProfileCard}>
        <View style={styles.accountIdentityRow}>
          <Avatar role={role} label={persona.initials} uri={avatarUri} />
          <View style={styles.flex}>
            <Text style={styles.accountName}>{persona.firstName} {persona.lastName}</Text>
            <Text style={styles.accountMeta}>{persona.profileLabel.replace(" • ", " • ")}</Text>
          </View>
        </View>
        <View style={styles.accountProgressTrack}>
          <View style={[styles.accountProgressFill, { backgroundColor: theme.text }]} />
        </View>
        <Text style={styles.accountProgressText}>Profile completion 86%</Text>
      </View>
      <Button role={role} variant="secondary" label="Edit profile" onPress={onEditProfile} />
      <Button role={role} variant="secondary" label="Payments" onPress={() => setScreen("payments")} />
      {role === "tutor" ? (
        <>
          <SectionTitle>Batch Requests</SectionTitle>
          {requests.length ? requests.map((request) => <BatchRequestCard key={request.id} role={role} request={request} approveRequest={approveRequest} requestAction={requestAction} actionLoading={actionLoading} />) : <Card role={role}><CardTitle>No batch requests</CardTitle><Muted>Student admission requests will appear here.</Muted></Card>}
        </>
      ) : null}
      {role === "student" ? (
        <>
          <SectionTitle>Parent access</SectionTitle>
          <View style={styles.accountInviteCard}>
            <FieldLabel>Relationship</FieldLabel>
            <DropdownField value={activationRelationship} options={["Mother", "Father", "Guardian", "Grandparent"]} onSelect={setActivationRelationship} />
            {activationCode ? (
              <>
                <Text style={styles.activationCodeText}>{activationCode}</Text>
                <Text style={styles.activationTimerText}>Code disappears in {activationSeconds}s</Text>
              </>
            ) : <Muted>Generate an activation code to invite a parent.</Muted>}
            <Button role={role} label={activationCode ? "Regenerate code" : "Generate activation code"} loading={actionLoading === "generateActivation"} onPress={generateActivationCode} />
          </View>
          {parents.length ? parents.map((parent) => (
            <View key={parent.id} style={styles.parentRow}>
              <Text style={styles.parentRowName}>{parent.name}</Text>
              <Text style={styles.parentRowMeta}>{parent.relationship} • Added</Text>
            </View>
          )) : null}
        </>
      ) : null}
      <Button role={role} variant="secondary" label="Sign out" onPress={signOut} />
    </>
  );
}

function Ratings({ role, back }: { role: Role; back: () => void }) {
  return (
    <>
      <TopBar title="Ratings & reviews" left="‹" onLeft={back} />
      <Card role={role}><CardTitle>4.8 average rating</CardTitle><Muted>Teaching quality, punctuality, communication, and value are tracked separately.</Muted></Card>
      <Card role={role}><CardTitle>Neha Verma</CardTitle><Muted>Clear explanations and very patient with algebra fundamentals.</Muted></Card>
    </>
  );
}

function SimpleScreen({ title, role, back }: { title: string; role: Role; back: () => void }) {
  return (
    <>
      <TopBar title={title} left="‹" onLeft={back} />
      <Input value="Mathematics" onChangeText={() => undefined} />
      {["Neha Verma • 94% match", "Rahul Menon • 89% match", "Ananya Iyer • 87% match"].map((item) => <Card role={role} key={item}><CardTitle>{item}</CardTitle><Muted>CBSE Math • Online/Home • ₹700/hr</Muted></Card>)}
    </>
  );
}

type NavIcon = ComponentType<SvgProps>;

function BottomNav({ role, screen, setScreen }: { role: Role; screen: AppScreen; setScreen: (screen: AppScreen) => void }) {
  const theme = useRoleTheme(role);
  const items: Array<{ id: AppScreen; label: string; activeIcon: NavIcon; inactiveIcon: NavIcon }> = [
    { id: "home", label: "Home", activeIcon: HomeActiveIcon, inactiveIcon: HomeInactiveIcon },
    { id: "sessions", label: "Program", activeIcon: MilesActiveIcon, inactiveIcon: MilesInactiveIcon },
    { id: "events", label: "Reminders", activeIcon: ClassActiveIcon, inactiveIcon: ClassInactiveIcon },
    { id: "chat", label: "Community", activeIcon: CommunityActiveIcon, inactiveIcon: CommunityInactiveIcon },
    { id: "account", label: "Account", activeIcon: AccountActiveIcon, inactiveIcon: AccountInactiveIcon }
  ];
  return (
    <View style={styles.nav}>
      {items.map(({ id, label, activeIcon: ActiveIcon, inactiveIcon: InactiveIcon }) => {
        const selected = screen === id;
        const Icon = selected ? ActiveIcon : InactiveIcon;
        const itemColor = selected ? theme.accentStrong : "#111827";
        return (
        <Pressable key={id} style={styles.navItem} onPress={() => setScreen(id)}>
          <Icon width={24} height={24} color={itemColor} fill={itemColor} style={styles.navSvgIcon} />
          <Text style={[styles.navText, { color: itemColor }]}>{label}</Text>
        </Pressable>
        );
      })}
    </View>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDisplayDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatDisplayTime(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
}

function parseDisplayDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDisplayTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  const date = new Date();
  if (!match) return date;
  const [, hour, minute, suffix] = match;
  const normalizedHour = (Number(hour) % 12) + (suffix.toUpperCase() === "PM" ? 12 : 0);
  date.setHours(normalizedHour, Number(minute), 0, 0);
  return date;
}

function combineReminderDateTime(date: string, time: string) {
  return `${date} ${time}`;
}

function buildTutorFilterOptions(tutors: TutorSearchResult[]): TutorFilterOptions {
  const details = tutors.flatMap((tutor) => tutor.tutionDetails ?? []);
  const curriculum = tutors.flatMap((tutor) => tutor.curriculumSelections ?? []);
  return {
    subjects: dedupe([...details.map((item) => item.subject), ...curriculum.map((item) => item.subject)]),
    locations: dedupe(details.map((item) => item.location)),
    grades: dedupe([...details.map((item) => item.grade), ...curriculum.map((item) => item.classLevel)]),
    boards: dedupe([...details.map((item) => item.board), ...curriculum.map((item) => item.board)]),
    modes: dedupe(details.map((item) => item.mode)),
    languages: dedupe(details.flatMap((item) => item.language)),
    genders: dedupe(details.map((item) => item.gender)),
    experience: dedupe(details.map((item) => `${item.experienceYears}+ years`), (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)),
    ratings: dedupe(details.map((item) => `${item.rating.toFixed(1)}+`), (a, b) => Number.parseFloat(a) - Number.parseFloat(b))
  };
}

function dedupe(values: string[], sorter?: (a: string, b: string) => number) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.sort(sorter ?? ((a, b) => a.localeCompare(b)));
}

async function apiGet<T>(path: string, accessToken?: string) {
  return apiRequest<T>(path, { accessToken });
}

async function apiPost<T = unknown>(path: string, body: unknown, accessToken?: string) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken
  });
}

async function apiPut<T = unknown>(path: string, body: unknown, accessToken?: string) {
  return apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
    accessToken
  });
}

async function apiDelete(path: string, accessToken?: string) {
  return apiRequest(path, { method: "DELETE", accessToken });
}

async function apiRequest<T = unknown>(path: string, options: RequestInit & { accessToken?: string } = {}) {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const styles = StyleSheet.create({
  appSplashShell: { alignItems: "center", backgroundColor: "#FFFFFF", flex: 1, gap: 16, justifyContent: "center", paddingHorizontal: 24, paddingTop: 34, paddingBottom: 18 },
  appSplashLogo: { borderRadius: 28, height: 150, width: 150 },
  shell: { flex: 1 },
  content: { flexGrow: 1, gap: 12, padding: 20, paddingTop: 56 },
  homeContent: { gap: 14, paddingHorizontal: 18 },
  valueContent: { justifyContent: "space-between" },
  contentWithNav: { paddingBottom: 124 },
  flex: { flex: 1 },
  bottomCta: { flex: 1, justifyContent: "flex-end", minHeight: 260 },
  signinActions: { gap: 14, marginTop: 18 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerIcon: { backgroundColor: "rgba(255,255,255,0.86)", borderColor: "rgba(215,227,240,0.9)", borderRadius: 13, borderWidth: 1, fontSize: 17, fontWeight: "800", height: 38, lineHeight: 38, overflow: "hidden", textAlign: "center", width: 38 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  topButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.88)", borderColor: "rgba(215,227,240,0.92)", borderRadius: 13, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  topButtonSpacer: { height: 40, width: 40 },
  topButtonText: { color: "#202A35", fontSize: 17, fontWeight: "800" },
  topTextAction: { alignItems: "flex-end", justifyContent: "center", minHeight: 40, width: 40 },
  topTextActionText: { color: "#202A35", fontSize: 12, fontWeight: "800" },
  topTitle: { color: "#202A35", fontSize: 16, fontWeight: "800", letterSpacing: 0.1 },
  milesHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 42, position: "relative" },
  milesHeaderSpacer: { height: 39, width: 39 },
  milesHeaderTitle: { color: "#202A35", fontSize: 18, fontWeight: "900", left: 58, position: "absolute", right: 58, textAlign: "center" },
  programMenu: { backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, overflow: "hidden", position: "absolute", right: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 18, top: 46, width: 188, zIndex: 5 },
  programMenuItem: { minHeight: 46, justifyContent: "center", paddingHorizontal: 14 },
  programMenuItemDisabled: { backgroundColor: "#F3F4F6", opacity: 0.72 },
  programMenuText: { color: "#202A35", fontSize: 14, fontWeight: "800" },
  programMenuTextDisabled: { color: "#8B95A1" },
  hero: { backgroundColor: "rgba(255,255,255,0.74)", borderRadius: 28, gap: 10, padding: 18, shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
  splash: { alignSelf: "center", height: 210, width: 210 },
  title: { color: "#202A35", fontSize: 21, fontWeight: "800", lineHeight: 27 },
  cardTitle: { color: "#202A35", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  sectionTitle: { color: "#202A35", fontSize: 20, fontWeight: "800", letterSpacing: 0.1, marginTop: 6 },
  muted: { color: "#5C6F89", fontSize: 14, lineHeight: 20 },
  card: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(214,225,235,0.9)", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15, shadowColor: "#22304A", shadowOpacity: 0.055, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  check: { color: "#111827", fontSize: 16, fontWeight: "900" },
  valueStage: { flex: 1, gap: 22, justifyContent: "center" },
  valueCopy: { gap: 8 },
  propArt: { alignItems: "center", alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.76)", borderColor: "rgba(215,227,240,0.9)", borderRadius: 20, borderWidth: 1, flex: 0.62, justifyContent: "center", minHeight: 300, overflow: "hidden", padding: 18 },
  propImage: { height: "100%", maxHeight: 330, width: "100%" },
  propIcon: { fontSize: 62, fontWeight: "900" },
  button: { alignItems: "stretch", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, overflow: "hidden", shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  buttonGradient: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  secondaryButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", paddingHorizontal: 16, shadowOpacity: 0.025 },
  buttonText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.1 },
  apiNotice: { backgroundColor: "rgba(255,255,255,0.82)", borderColor: "#D8E4EE", borderRadius: 14, borderWidth: 1, color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17, padding: 10 },
  checkbox: { color: "#111827", flex: 1, fontWeight: "700", lineHeight: 20 },
  fieldLabel: { color: "#2F3B4C", fontSize: 12, fontWeight: "800", letterSpacing: 0.1 },
  input: { alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#C9D6E4", borderRadius: 13, borderWidth: 1, color: "#111827", fontSize: 14, minHeight: 48, minWidth: 0, paddingHorizontal: 14, width: "100%" },
  compactInput: { minWidth: 0 },
  otpShell: { position: "relative" },
  otpRow: { flexDirection: "row", gap: 8 },
  otpInput: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 14, borderWidth: 1, height: 52, justifyContent: "center", width: 48 },
  otpInputFilled: { borderColor: "#8AA4B9" },
  otpDigit: { color: "#111827", fontSize: 22, fontWeight: "900" },
  otpHiddenInput: { bottom: 0, color: "transparent", left: 0, opacity: 0.02, position: "absolute", right: 0, top: 0 },
  linkText: { fontWeight: "800", textDecorationLine: "underline" },
  fieldShell: { position: "relative" },
  eye: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 999, height: 34, justifyContent: "center", position: "absolute", right: 8, top: 8, width: 34 },
  roleLandingBrand: { alignItems: "center", gap: 6, marginBottom: 12, marginTop: 4 },
  roleLandingLogo: { borderRadius: 22, height: 112, width: 112 },
  signinFormBrand: { alignItems: "center", gap: 6, marginTop: 24, marginBottom: 22 },
  freshSigninLogo: { borderRadius: 28, height: 150, width: 150 },
  freshSigninBrand: { color: "#202A35", fontSize: 31, fontWeight: "900", marginTop: 18 },
  freshSigninCopy: { color: "#536A86", fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 10, textAlign: "center" },
  headerIconButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 14, height: 39, justifyContent: "center", width: 39 },
  headerIconButtonText: { color: "#0F5560", fontSize: 13, fontWeight: "900" },
  signinCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.74)", borderColor: "rgba(210,230,235,0.95)", borderRadius: 22, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 24 },
  signinKicker: { color: "#536A86", fontSize: 12, fontWeight: "600" },
  signinName: { color: "#202A35", fontSize: 25, fontWeight: "900", lineHeight: 30 },
  signinCopy: { color: "#536A86", flexBasis: "100%", fontSize: 14, fontWeight: "600", lineHeight: 22 },
  registerLink: { alignItems: "center", justifyContent: "center", minHeight: 28 },
  registerLinkText: { color: "#0F5560", fontSize: 14, fontWeight: "900", textDecorationLine: "underline" },
  forgotPasswordLink: { alignItems: "flex-end", justifyContent: "center", minHeight: 28 },
  forgotPasswordText: { fontSize: 13, fontWeight: "900", textDecorationLine: "underline" },
  consentCard: { alignItems: "flex-start", backgroundColor: "rgba(255,255,255,0.88)", borderColor: "#D8E4EE", borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 18 },
  consentCheck: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#8A99A8", borderRadius: 3, borderWidth: 1, height: 13, justifyContent: "center", marginTop: 2, width: 13 },
  consentCheckText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", lineHeight: 12 },
  consentText: { color: "#536A86", flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  avatar: { alignItems: "center", borderRadius: 18, height: 48, justifyContent: "center", width: 48 },
  avatarLarge: { borderRadius: 28, height: 84, width: 84 },
  avatarText: { fontSize: 17, fontWeight: "900" },
  avatarImage: { borderRadius: 18, height: 48, width: 48 },
  avatarImageLarge: { borderRadius: 28, height: 84, width: 84 },
  avatarEditor: { alignItems: "center", alignSelf: "center", justifyContent: "center" },
  pencil: { borderRadius: 999, color: "#FFFFFF", fontWeight: "900", marginTop: -22, overflow: "hidden", padding: 7 },
  profileProgressTrack: { backgroundColor: "#C7D5DD", borderRadius: 999, height: 5, overflow: "hidden" },
  profileProgressFill: { borderRadius: 999, height: 5 },
  twoColumn: { flexDirection: "row", gap: 10 },
  fieldColumn: { flex: 1, gap: 7, minWidth: 0 },
  textArea: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 16, borderWidth: 1, color: "#111827", minHeight: 78, padding: 14, textAlignVertical: "top" },
  dropdownWrap: { gap: 8 },
  dropdownField: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#C9D6E4", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14 },
  dropdownText: { color: "#111827", flex: 1, fontSize: 14, fontWeight: "600" },
  dropdownCaret: { color: "#111827", fontSize: 18, fontWeight: "900" },
  dropdownList: { backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  dropdownOption: { borderBottomColor: "#EEF3F7", borderBottomWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 14 },
  dropdownOptionSelected: { backgroundColor: "#F2FAFC" },
  dropdownOptionText: { color: "#111827", fontSize: 14, fontWeight: "700" },
  multiSelectChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  multiSelectChip: { backgroundColor: "#F2FAFC", borderColor: "#C9D6E4", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  multiSelectChipText: { color: "#263444", fontSize: 12, fontWeight: "800" },
  trackCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 96,
    padding: 17,
    shadowColor: "#3D8790",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2
  },
  trackTitle: { color: "#202A35", fontSize: 16, fontWeight: "900", lineHeight: 21 },
  trackCopy: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 21, marginTop: 2 },
  trackButton: { borderRadius: 18, minHeight: 48, overflow: "hidden" },
  trackButtonGradient: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 19 },
  trackButtonText: { fontSize: 14, fontWeight: "900" },
  notificationCard: { borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, gap: 10, padding: 14, shadowColor: "#22304A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 1 },
  notificationHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  notificationTitle: { color: "#202A35", fontSize: 15, fontWeight: "900" },
  notificationCount: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 999, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  notificationRow: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.76)", borderRadius: 13, flexDirection: "row", gap: 10, minHeight: 56, padding: 10 },
  notificationDot: { borderRadius: 999, height: 9, width: 9 },
  notificationRowTitle: { color: "#202A35", fontSize: 13, fontWeight: "900", lineHeight: 17 },
  notificationBody: { color: "#536A86", fontSize: 12, fontWeight: "600", lineHeight: 16 },
  notificationAction: { fontSize: 11, fontWeight: "900" },
  smartPickCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 82, padding: 15 },
  carousel: { gap: 12, paddingBottom: 10 },
  marketplaceCard: { backgroundColor: "#F2E1E5", borderColor: "#E8CFD8", borderRadius: 16, borderWidth: 1, gap: 7, minHeight: 178, padding: 14, shadowColor: "#22304A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.045, shadowRadius: 12, width: 210 },
  marketplaceAvatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  marketplaceAvatarText: { color: "#202A35", fontSize: 14, fontWeight: "900" },
  marketplaceEyebrow: { color: "#6B3F75", fontSize: 11, fontWeight: "900", marginTop: 2, textTransform: "uppercase" },
  marketplaceTitle: { color: "#111827", fontSize: 16, fontWeight: "900", lineHeight: 21 },
  marketplaceMeta: { color: "#3E4B5E", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  marketplaceCopy: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: "auto" },
  programJourneyCard: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 17, borderWidth: 1, gap: 14, padding: 16, shadowColor: "#22304A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  programJourneyTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  programJourneyTitle: { color: "#202A35", fontSize: 18, fontWeight: "800", lineHeight: 23 },
  programJourneyCopy: { color: "#536A86", fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 2 },
  programJourneyAction: { fontSize: 13, fontWeight: "900" },
  programTracker: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  programTrackerDot: { backgroundColor: "#FFFFFF", borderColor: "#C8D4E3", borderRadius: 999, borderWidth: 2, height: 14, width: 14 },
  programStatsRow: { flexDirection: "row", gap: 10 },
  programStat: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, flex: 1, padding: 10 },
  programStatValue: { color: "#111827", fontSize: 20, fontWeight: "900", lineHeight: 24 },
  programStatLabel: { color: "#536A86", fontSize: 11, fontWeight: "800", lineHeight: 15, marginTop: 2 },
  programCompletedCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#BFE7C8", borderRadius: 22, borderWidth: 1, gap: 8, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 18 },
  programCompletedIcon: { backgroundColor: "#DCFCE7", borderRadius: 999, color: "#16A34A", fontSize: 26, fontWeight: "900", height: 50, lineHeight: 50, overflow: "hidden", textAlign: "center", width: 50 },
  programCompletedTitle: { color: "#111827", fontSize: 20, fontWeight: "900", lineHeight: 25 },
  programCompletedCopy: { color: "#536A86", fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  journeyResourceCard: { borderColor: "#E2E8F0", borderRadius: 16, borderWidth: 1, gap: 8, minHeight: 204, padding: 13, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 1, width: 214 },
  journeyResourceImage: { alignItems: "center", borderRadius: 16, height: 78, justifyContent: "center" },
  journeyResourceGlyph: { fontSize: 32, fontWeight: "900" },
  journeyResourceTopic: { color: "#64748B", fontSize: 12, fontWeight: "800", lineHeight: 16 },
  journeyResourceTitle: { color: "#111827", fontSize: 16, fontWeight: "900", lineHeight: 21 },
  journeyResourceType: { color: "#536A86", fontSize: 12, fontWeight: "800", lineHeight: 16, marginTop: "auto" },
  recCard: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 112,
    padding: 13,
    shadowColor: "#22304A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    width: 264
  },
  recBody: { flex: 1, gap: 4 },
  recBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  recBadgeText: { fontSize: 10, fontWeight: "900" },
  recTitle: { color: "#202A35", fontSize: 15, fontWeight: "800", lineHeight: 20 },
  recMeta: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 18 },
  thumb: { alignItems: "center", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  thumbText: { fontSize: 16, fontWeight: "900" },
  emptyInlineCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, padding: 15 },
  todayCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#DDE7EF",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 80,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 16
  },
  todayTitle: { color: "#202A35", fontSize: 16, fontWeight: "900", lineHeight: 20 },
  todayMeta: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 18 },
  todayBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  todayBadgeText: { fontSize: 11, fontWeight: "900" },
  doubtScreen: { gap: 14 },
  doubtHeader: { alignItems: "center", backgroundColor: "#2C1645", borderRadius: 24, flexDirection: "row", gap: 12, marginHorizontal: -4, marginTop: -14, paddingHorizontal: 16, paddingVertical: 16 },
  doubtBackButton: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  doubtBackText: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", lineHeight: 30 },
  doubtHeaderTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", lineHeight: 22 },
  doubtHeaderSubtitle: { color: "#F1D5F2", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 2, opacity: 0.85 },
  doubtSearchBox: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(221,231,239,0.9)", borderRadius: 20, borderWidth: 1, gap: 10, padding: 12 },
  doubtSearchBar: { alignItems: "center", backgroundColor: "#F5EEF6", borderRadius: 14, flexDirection: "row", gap: 9, minHeight: 44, paddingHorizontal: 12 },
  doubtSearchIcon: { color: "#6B5B7B", fontSize: 17, fontWeight: "900" },
  doubtSearchInput: { color: "#1E1030", flex: 1, fontSize: 14, fontWeight: "700", minHeight: 42, padding: 0 },
  doubtFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  doubtChip: { backgroundColor: "#F5EEF6", borderRadius: 999, minHeight: 32, paddingHorizontal: 14, justifyContent: "center" },
  doubtChipText: { color: "#6B5B7B", fontSize: 12, fontWeight: "900" },
  doubtChipTextActive: { color: "#FFFFFF" },
  doubtFeed: { gap: 14 },
  doubtSectionLabel: { color: "#6B5B7B", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginTop: 4 },
  doubtCard: { backgroundColor: "#FFFFFF", borderColor: "rgba(221,231,239,0.95)", borderLeftColor: "transparent", borderLeftWidth: 4, borderRadius: 18, borderWidth: 1, gap: 10, padding: 15, shadowColor: "#5A3284", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14 },
  doubtCardPinned: { backgroundColor: "#F2FAFA" },
  doubtCardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  doubtUserRow: { alignItems: "center", flexDirection: "row", gap: 8, flex: 1 },
  doubtAvatar: { alignItems: "center", backgroundColor: "#5A3284", borderRadius: 999, height: 30, justifyContent: "center", width: 30 },
  doubtAvatarMuted: { backgroundColor: "#6B5B7B" },
  doubtAvatarText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  doubtUserName: { color: "#1E1030", fontSize: 13, fontWeight: "900", lineHeight: 17 },
  inlineTeacherBadge: { color: "#FFFFFF", backgroundColor: "#5A3284", fontSize: 9, fontWeight: "900" },
  doubtTime: { color: "#6B5B7B", fontSize: 11, fontWeight: "700", lineHeight: 15 },
  doubtStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  doubtSolved: { backgroundColor: "#E8F8EE" },
  doubtOpen: { backgroundColor: "#FFF3E0" },
  doubtStatusText: { fontSize: 11, fontWeight: "900" },
  doubtSolvedText: { color: "#27AE60" },
  doubtOpenText: { color: "#E65100" },
  doubtCardBody: { flexDirection: "row", gap: 12 },
  doubtCardTitle: { color: "#1E1030", fontSize: 14, fontWeight: "900", lineHeight: 19 },
  doubtCardText: { color: "#1E1030", fontSize: 14, fontWeight: "600", lineHeight: 20, marginTop: 3 },
  doubtAttachment: { alignItems: "center", backgroundColor: "#EFE7F4", borderRadius: 10, height: 52, justifyContent: "center", width: 52 },
  doubtAttachmentText: { color: "#5A3284", fontSize: 10, fontWeight: "900" },
  doubtCardFooter: { borderTopColor: "#F5EEF6", borderTopWidth: 1, flexDirection: "row", gap: 18, paddingTop: 10 },
  doubtInteraction: { color: "#6B5B7B", fontSize: 12, fontWeight: "900" },
  askFab: { alignItems: "center", alignSelf: "flex-end", borderRadius: 999, minHeight: 48, justifyContent: "center", paddingHorizontal: 18, shadowColor: "#5A3284", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
  askFabText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  doubtDetailCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
  doubtDetailTitle: { color: "#1E1030", fontSize: 19, fontWeight: "900", lineHeight: 24 },
  doubtScopeText: { color: "#7C5C9E", fontSize: 12, fontWeight: "900", lineHeight: 17, textTransform: "uppercase" },
  doubtDetailBody: { color: "#1E1030", fontSize: 15, fontWeight: "600", lineHeight: 23 },
  doubtModerationText: { backgroundColor: "#FEF3C7", borderRadius: 12, color: "#92400E", fontSize: 12, fontWeight: "800", lineHeight: 17, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 8 },
  teacherSolutionBox: { backgroundColor: "#F9F3FC", borderColor: "#5A3284", borderRadius: 18, borderWidth: 1.5, gap: 10, padding: 15 },
  teacherBadge: { alignSelf: "flex-start", backgroundColor: "#5A3284", borderRadius: 6, color: "#FFFFFF", fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4 },
  teacherSolutionText: { color: "#1E1030", fontSize: 14, fontWeight: "600", lineHeight: 21 },
  formulaBox: { backgroundColor: "#FFFFFF", borderColor: "#E1D2EC", borderRadius: 10, borderWidth: 1, color: "#5A3284", fontSize: 15, fontWeight: "900", padding: 12, textAlign: "center" },
  communityAnswerCard: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 16, borderWidth: 1, gap: 8, padding: 13 },
  peerTutorLabel: { color: "#148087", fontSize: 12, fontWeight: "900" },
  noAnswerCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 16, borderWidth: 1, gap: 4, padding: 24 },
  noAnswerTitle: { color: "#1E1030", fontSize: 15, fontWeight: "900" },
  communityDetailActions: { alignItems: "flex-end", minHeight: 34 },
  communityReportButton: { backgroundColor: "#F8FAFC", borderColor: "#E5E7EB", borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  communityReportText: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  replyBar: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 10, padding: 10 },
  replyAttach: { fontSize: 20, fontWeight: "900" },
  replyInput: { backgroundColor: "#F5EEF6", borderRadius: 999, color: "#1E1030", flex: 1, fontSize: 14, fontWeight: "700", minHeight: 40, paddingHorizontal: 14 },
  replySend: { alignItems: "center", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  replySendText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", lineHeight: 26 },
  askDoubtCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, gap: 13, padding: 16 },
  askDoubtInput: { backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, color: "#1E1030", fontSize: 14, fontWeight: "700", minHeight: 128, padding: 12, textAlignVertical: "top" },
  attachmentUploader: { alignItems: "center", backgroundColor: "rgba(90,50,132,0.03)", borderColor: "#5A3284", borderRadius: 16, borderStyle: "dashed", borderWidth: 1.5, gap: 8, minHeight: 104, justifyContent: "center" },
  attachmentIcon: { color: "#5A3284", fontSize: 28, fontWeight: "900" },
  attachmentText: { fontSize: 13, fontWeight: "900" },
  anonymousToggle: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 13 },
  anonymousTitle: { color: "#1E1030", fontSize: 14, fontWeight: "900" },
  anonymousCopy: { color: "#6B5B7B", fontSize: 11, fontWeight: "700", marginTop: 2 },
  milesSummaryCard: { backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 22, borderWidth: 1, gap: 6, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 18 },
  milestoneDetailTitle: { color: "#111827", fontSize: 29, fontWeight: "900", lineHeight: 35, marginTop: 8 },
  milestoneDetailCopy: { color: "#111827", fontSize: 18, fontWeight: "500", lineHeight: 28, marginTop: 8 },
  milestoneDetailTrack: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 5, marginTop: 22, overflow: "hidden" },
  milestoneDetailFill: { borderRadius: 999, height: 5 },
  milestoneProgressText: { color: "#4B5563", fontSize: 16, fontWeight: "800", marginBottom: 14 },
  activitySectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  activitySectionTitle: { color: "#111827", fontSize: 22, fontWeight: "900" },
  activityBadge: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  activityBadgeText: { fontSize: 13, fontWeight: "900" },
  optionalBadge: { backgroundColor: "#F2F2F2", borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  optionalBadgeText: { color: "#111827", fontSize: 13, fontWeight: "900" },
  activityRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DFE4EA", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 13, minHeight: 94, padding: 12, shadowColor: "#22304A", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.035, shadowRadius: 10, elevation: 1 },
  activityRowDisabled: { opacity: 0.82 },
  activityRowComplete: { borderColor: "#BFE7C8" },
  activityIconBox: { alignItems: "center", borderRadius: 10, height: 72, justifyContent: "center", width: 72 },
  activityIcon: { color: "#111827", fontSize: 30, fontWeight: "900" },
  activityTitle: { color: "#111827", fontSize: 18, fontWeight: "800", lineHeight: 24 },
  activityType: { color: "#111827", fontSize: 16, fontWeight: "500", lineHeight: 22, marginTop: 2 },
  activityCompleteTick: { alignItems: "center", backgroundColor: "#35B34A", borderRadius: 999, height: 28, justifyContent: "center", width: 28 },
  activityCompleteTickText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  activityEditButton: { alignItems: "center", backgroundColor: "#F8FAFC", borderColor: "#DDE7EF", borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 34, paddingHorizontal: 14 },
  activityEditText: { color: "#202A35", fontSize: 12, fontWeight: "900" },
  bottomCtaInline: { marginTop: 26 },
  milesSummaryTitle: { color: "#202A35", fontSize: 17, fontWeight: "900", lineHeight: 22 },
  milesSummaryCopy: { color: "#536A86", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  selectedProgramPanel: { borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 8, padding: 12 },
  programStatusLine: { alignItems: "flex-start", marginTop: -2 },
  programStatusPill: { backgroundColor: "rgba(255,255,255,0.82)", borderColor: "#DDE7EF", borderRadius: 999, borderWidth: 1, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 7 },
  programLifecycleActions: { gap: 8, marginTop: 10 },
  tutorEmptyProgramCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7DFFF", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 10, minHeight: 150, padding: 14, shadowColor: "#5B3DF5", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 22, elevation: 2 },
  tutorEmptyIllustration: { alignItems: "center", borderRadius: 18, height: 108, justifyContent: "center", overflow: "hidden", width: 88 },
  tutorEmptySparkle: { color: "#8C7BFF", fontSize: 15, fontWeight: "900", left: 10, position: "absolute", top: 10 },
  tutorEmptyBooks: { fontSize: 42, lineHeight: 48, marginTop: 4 },
  tutorEmptyBookBase: { color: "#8C7BFF", fontSize: 34, lineHeight: 34, marginTop: -10 },
  tutorEmptyBody: { flex: 1, gap: 6, minWidth: 0 },
  tutorEmptyChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tutorEmptyChipText: { fontSize: 10, fontWeight: "900" },
  tutorEmptyIcon: { alignItems: "center", borderRadius: 28, height: 78, justifyContent: "center", width: 78 },
  tutorEmptyIconText: { fontSize: 34, fontWeight: "900", lineHeight: 40 },
  tutorEmptyTitle: { color: "#202A35", fontSize: 20, fontWeight: "900", lineHeight: 25 },
  tutorEmptyCopy: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  tutorEmptyCta: { alignSelf: "center", borderRadius: 14, height: 48, marginTop: 4, overflow: "hidden", width: 230 },
  tutorEmptyCtaGradient: { alignItems: "center", height: 48, justifyContent: "center", paddingHorizontal: 18 },
  tutorEmptyCtaText: { color: "#201A00", fontSize: 14, fontWeight: "900" },
  tutorEmptyAddTile: { alignItems: "center", borderRadius: 16, borderStyle: "dashed", borderWidth: 1, gap: 8, height: 108, justifyContent: "center", width: 86 },
  tutorEmptyAddIcon: { alignItems: "center", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  tutorEmptyAddIconText: { fontSize: 24, fontWeight: "800", lineHeight: 28 },
  tutorEmptyAddText: { fontSize: 10, fontWeight: "900", textAlign: "center" },
  tutorProgramPanel: { gap: 14 },
  tutorProgramSummary: { borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 18 },
  tutorProgramEyebrow: { color: "#64748B", fontSize: 12, fontWeight: "900", letterSpacing: 0 },
  tutorProgramTitle: { color: "#202A35", fontSize: 18, fontWeight: "900", lineHeight: 24, marginTop: 4 },
  tutorProgramCopy: { color: "#536A86", fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 4 },
  tutorSelectedProgramMeta: { backgroundColor: "rgba(255,255,255,0.64)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, gap: 2, padding: 12 },
  smallOutlineButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 999, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 18 },
  smallOutlineButtonText: { fontSize: 13, fontWeight: "900" },
  tutorComposerCard: { borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, gap: 10, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 18 },
  tutorComposerTitle: { color: "#202A35", fontSize: 22, fontWeight: "900", lineHeight: 28 },
  tutorMilestoneEditor: { backgroundColor: "rgba(255,255,255,0.68)", borderColor: "#DDE7EF", borderRadius: 20, borderWidth: 1, gap: 10, marginTop: 10, padding: 12 },
  tutorResourceEditor: { backgroundColor: "rgba(255,255,255,0.86)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 8, padding: 12 },
  tutorResourceTitle: { color: "#202A35", fontSize: 16, fontWeight: "900" },
  tutorResourcePill: { backgroundColor: "#F2F7FB", borderRadius: 999, color: "#536A86", fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  authoringBackdrop: { flex: 1, justifyContent: "center", padding: 14 },
  authoringModalShell: { alignSelf: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, maxHeight: "92%", overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.16, shadowRadius: 30, width: "100%" },
  authoringHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  authoringTitle: { color: "#111827", fontSize: 20, fontWeight: "900", lineHeight: 26, padding: 18, paddingBottom: 8 },
  authoringClose: { alignItems: "center", borderRadius: 999, height: 36, justifyContent: "center", marginRight: 10, width: 36 },
  authoringCloseText: { color: "#111827", fontSize: 24, fontWeight: "300", lineHeight: 28 },
  authoringContent: { gap: 10, padding: 16, paddingTop: 4 },
  authoringDescription: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 8, borderWidth: 1, color: "#111827", minHeight: 94, padding: 12, textAlignVertical: "top" },
  authoringCounter: { alignSelf: "flex-end", color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: -6 },
  authoringHint: { color: "#64748B", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  authoringItemTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  authoringTypeButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, minWidth: "47%", paddingHorizontal: 12 },
  authoringTypeIcon: { alignItems: "center", borderRadius: 999, height: 30, justifyContent: "center", width: 30 },
  authoringTypeIconText: { fontSize: 15, fontWeight: "900" },
  authoringTypeLabel: { color: "#111827", flex: 1, fontSize: 13, fontWeight: "900" },
  authoringPlus: { color: "#4338CA", fontSize: 20, fontWeight: "700" },
  authoringMilestoneToolbar: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 8 },
  authoringSectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900", lineHeight: 22 },
  authoringSmallAction: { backgroundColor: "#F8FAFC", borderColor: "#DDE7EF", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  authoringSmallActionText: { fontSize: 12, fontWeight: "900" },
  authoringMilestoneBlock: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 },
  authoringMilestoneHeader: { alignItems: "flex-end", flexDirection: "row", gap: 10 },
  authoringDelete: { color: "#EF4444", fontSize: 12, fontWeight: "900" },
  authoringResourceRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 9, minHeight: 52, paddingHorizontal: 9, paddingVertical: 8 },
  authoringMoveStack: { alignItems: "center", gap: 2, justifyContent: "center", width: 22 },
  authoringMoveText: { color: "#64748B", fontSize: 14, fontWeight: "900", lineHeight: 16 },
  authoringSequence: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 6, height: 28, justifyContent: "center", width: 28 },
  authoringSequenceText: { color: "#475569", fontSize: 12, fontWeight: "900" },
  authoringResourceTitle: { color: "#111827", fontSize: 13, fontWeight: "900", lineHeight: 17 },
  authoringResourceMeta: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  authoringTypeBadge: { borderRadius: 999, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  authoringKebab: { color: "#334155", fontSize: 20, fontWeight: "600" },
  authoringEditorPanel: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, gap: 10, marginTop: 8, padding: 12 },
  authoringUploadGrid: { gap: 9 },
  authoringImagePreview: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, height: 120, width: "100%" },
  authoringBannerPreview: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, height: 150, width: "100%" },
  authoringUploadOption: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 58, padding: 12 },
  authoringUploadIcon: { alignItems: "center", backgroundColor: "#EEF2FF", borderRadius: 8, height: 36, justifyContent: "center", width: 36 },
  authoringUploadIconText: { color: "#4338CA", fontSize: 18, fontWeight: "900" },
  authoringUploadTitle: { color: "#111827", fontSize: 13, fontWeight: "900" },
  authoringUploadMeta: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  authoringUploadNote: { color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: -5 },
  authoringSplitEditor: { gap: 10 },
  authoringNestedCard: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 },
  quizOptionGroup: { gap: 8 },
  quizOptionRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 46, paddingHorizontal: 10, paddingVertical: 7 },
  quizOptionInput: { color: "#111827", flex: 1, fontSize: 13, fontWeight: "700", minHeight: 34, paddingVertical: 6 },
  quizCorrectToggle: { alignItems: "center", borderRadius: 999, borderWidth: 1, minHeight: 28, justifyContent: "center", minWidth: 78, paddingHorizontal: 10, paddingVertical: 5 },
  quizCorrectToggleOn: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  quizCorrectToggleOff: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  quizCorrectToggleText: { fontSize: 10, fontWeight: "900" },
  quizCorrectToggleTextOn: { color: "#16A34A" },
  quizCorrectToggleTextOff: { color: "#64748B" },
  quizOptionDelete: { alignItems: "center", backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 999, borderWidth: 1, height: 26, justifyContent: "center", width: 26 },
  quizOptionDeleteText: { color: "#64748B", fontSize: 16, fontWeight: "900", lineHeight: 18 },
  quizAddOption: { alignSelf: "flex-start", paddingHorizontal: 2, paddingVertical: 5 },
  quizAddOptionText: { fontSize: 12, fontWeight: "900" },
  authoringFooter: { backgroundColor: "#FFFFFF", borderTopColor: "#E2E8F0", borderTopWidth: 1, flexDirection: "row", gap: 10, justifyContent: "flex-end", padding: 14 },
  tutorProgramSectionTitle: { color: "#202A35", fontSize: 15, fontWeight: "900", marginTop: 4 },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  textAreaSmall: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 16, borderWidth: 1, color: "#111827", minHeight: 64, padding: 14, textAlignVertical: "top" },
  flashcardEditorRow: { gap: 8 },
  quizEditorRow: { gap: 8 },
  milesTimeline: { gap: 10, paddingBottom: 18, paddingTop: 10 },
  mileRow: { flexDirection: "row", minHeight: 148 },
  mileRail: { alignItems: "center", marginRight: 12, width: 44 },
  mileRailLine: { position: "absolute", width: 5 },
  mileRailLineTop: { bottom: 82, top: 0 },
  mileRailLineBottom: { bottom: 0, top: 44 },
  mileRailLineLocked: { backgroundColor: "#DDD5E8" },
  mileNode: { alignItems: "center", borderColor: "#FFFFFF", borderRadius: 999, borderWidth: 3, height: 40, justifyContent: "center", marginTop: 26, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.10, shadowRadius: 12, width: 40, zIndex: 2 },
  mileNodeLocked: { backgroundColor: "#F1ECF8", borderColor: "#E1D9EC" },
  mileNodeText: { fontSize: 15, fontWeight: "900" },
  mileCard: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#EEE8FF", borderRadius: 18, borderWidth: 1, flex: 1, gap: 12, marginBottom: 24, minHeight: 132, padding: 14, shadowColor: "#5B3DF5", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 2 },
  mileCardActive: { minHeight: 148, shadowOpacity: 0.11 },
  mileCardLocked: { backgroundColor: "rgba(221,211,233,0.72)", borderColor: "rgba(221,211,233,0.72)", shadowOpacity: 0.02 },
  mileChip: { alignSelf: "center", borderRadius: 8, marginTop: -28, paddingHorizontal: 13, paddingVertical: 5 },
  mileChipText: { fontSize: 12, fontWeight: "900" },
  mileCardTopRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  mileCardTopRowTutor: { alignItems: "flex-start", flexDirection: "row", gap: 0 },
  mileIconTile: { alignItems: "center", borderColor: "#E7DFFF", borderRadius: 14, borderWidth: 1, height: 52, justifyContent: "center", width: 52 },
  mileIconText: { fontSize: 24, fontWeight: "900", lineHeight: 28 },
  mileTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  mileCardTitle: { color: "#202A35", flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  mileCardTitleLocked: { color: "#6F687C" },
  mileCountPill: { backgroundColor: "#F2EEFF", borderRadius: 999, color: "#5B3DF5", fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  mileProgressTrack: { backgroundColor: "#E8E5EF", borderRadius: 999, height: 5, marginTop: 10, overflow: "hidden", width: "100%" },
  mileProgressFill: { borderRadius: 999, height: 5 },
  mileProgressText: { color: "#6B7280", fontSize: 12, fontWeight: "800", marginTop: 7 },
  mileActivityText: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  mileCta: { alignItems: "center", borderColor: "transparent", borderRadius: 12, borderWidth: 1.5, justifyContent: "center", minHeight: 44, overflow: "hidden", width: "100%" },
  mileCtaGradient: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 18, width: "100%" },
  mileCtaIcon: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  mileCtaOutline: { backgroundColor: "#FFFFFF" },
  mileCtaLocked: { backgroundColor: "rgba(198,188,211,0.72)", borderColor: "transparent" },
  mileCtaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 1, width: "47%" },
  metricValue: { color: "#111827", fontSize: 24, fontWeight: "900" },
  reminderCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#D8E0E8",
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    shadowColor: "#22304A",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2
  },
  reminderLabel: {
    color: "#253243",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7
  },
  reminderTitleInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C9D6E4",
    borderRadius: 18,
    borderWidth: 1,
    color: "#111827",
    fontSize: 14,
    minHeight: 43,
    paddingHorizontal: 13
  },
  reminderGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  reminderField: {
    flex: 1
  },
  reminderInputShell: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#C9D6E4",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 12
  },
  reminderInlineInput: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  reminderInlineText: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  reminderAdornment: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900"
  },
  reminderButton: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 49,
    overflow: "hidden"
  },
  reminderButtonGradient: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 49,
    width: "100%"
  },
  reminderButtonText: {
    fontWeight: "900"
  },
  reminderPreviewCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#DDE7EF",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  reminderPreviewRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 72,
    padding: 16
  },
  reminderPreviewDivider: {
    borderBottomColor: "rgba(148,163,184,0.24)",
    borderBottomWidth: 1
  },
  reminderSummaryTitle: {
    color: "#26313F",
    fontSize: 16,
    fontWeight: "900"
  },
  reminderSummaryMeta: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "900"
  },
  swipeReminderShell: {
    borderRadius: 18,
    minHeight: 76,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  swipeActions: {
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    paddingRight: 10,
    position: "absolute",
    right: 0,
    top: 0,
    width: 122
  },
  swipeActionButton: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  swipeDeleteButton: {
    backgroundColor: "#FEE2E2"
  },
  swipeActionIcon: {
    fontSize: 20,
    fontWeight: "900"
  },
  swipeDeleteIcon: {
    color: "#B91C1C",
    fontSize: 20,
    fontWeight: "900"
  },
  swipeReminderCard: {
    alignItems: "flex-start",
    borderColor: "#DDE7EF",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 76,
    padding: 16
  },
  viewAllCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "#DDE7EF",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    shadowColor: "#22304A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "900"
  },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.64)", flex: 1, justifyContent: "center", padding: 20 },
  programModalCard: { backgroundColor: "rgba(255,255,255,0.99)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 14, minHeight: 318, overflow: "hidden", padding: 18, position: "relative", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.16, shadowRadius: 26, elevation: 6, width: "100%" },
  programModalClose: { alignItems: "center", backgroundColor: "#F3F6F9", borderRadius: 999, height: 34, justifyContent: "center", position: "absolute", right: 14, top: 14, width: 34, zIndex: 2 },
  programModalCloseText: { color: "#202A35", fontSize: 24, fontWeight: "700", lineHeight: 28 },
  programModalTitle: { color: "#202A35", fontSize: 21, fontWeight: "900", lineHeight: 27, textAlign: "center" },
  programModalCopy: { color: "#536A86", fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  programPreparing: { alignItems: "center", flex: 1, gap: 18, justifyContent: "center", minHeight: 260 },
  modalBottomCta: { marginTop: 64 },
  archiveProgramRow: { alignItems: "center", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 68, padding: 12 },
  archiveProgramTitle: { color: "#202A35", fontSize: 14, fontWeight: "900", lineHeight: 19 },
  archiveProgramMeta: { color: "#536A86", fontSize: 12, fontWeight: "800", marginTop: 2 },
  archiveActionButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, minWidth: 88, paddingHorizontal: 14 },
  archiveActionText: { fontSize: 12, fontWeight: "900" },
  toast: { alignItems: "center", backgroundColor: "rgba(32,42,53,0.94)", borderRadius: 999, bottom: 104, left: 24, minHeight: 44, paddingHorizontal: 18, position: "absolute", right: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18 },
  toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", lineHeight: 44, textAlign: "center" },
  accountHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  accountTitle: {
    color: "#202A35",
    fontSize: 20,
    fontWeight: "900"
  },
  accountProfileCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#D8E8EF",
    borderRadius: 17,
    borderWidth: 1,
    gap: 16,
    padding: 16,
    shadowColor: "#22304A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2
  },
  accountIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  accountName: {
    color: "#202A35",
    fontSize: 16,
    fontWeight: "900"
  },
  accountMeta: {
    color: "#536A86",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19
  },
  accountProgressTrack: {
    backgroundColor: "#CCD8E0",
    borderRadius: 999,
    height: 5,
    overflow: "hidden"
  },
  accountProgressFill: {
    borderRadius: 999,
    height: 5,
    width: "86%"
  },
  accountProgressText: {
    color: "#536A86",
    fontSize: 14,
    fontWeight: "700"
  },
  topicTrayBackdrop: { backgroundColor: "rgba(15,23,42,0.36)", bottom: -20, left: -20, paddingTop: 120, position: "absolute", right: -20, top: -58 },
  topicTray: { alignItems: "center", backgroundColor: "#FFFFFF", borderTopLeftRadius: 34, borderTopRightRadius: 34, bottom: 0, gap: 14, left: 0, minHeight: 360, padding: 24, paddingBottom: 28, position: "absolute", right: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: -14 }, shadowOpacity: 0.16, shadowRadius: 24 },
  trayHandle: { backgroundColor: "#6B6178", borderRadius: 999, height: 5, marginBottom: 18, width: 42 },
  trophyCircle: { alignItems: "center", backgroundColor: "#F8DDFC", borderRadius: 999, height: 168, justifyContent: "center", width: 168 },
  trophyIcon: { fontSize: 72 },
  topicCompleteTitle: { color: "#111827", fontSize: 27, fontWeight: "900", lineHeight: 34, textAlign: "center" },
  topicCompleteCopy: { color: "#3F4754", fontSize: 16, fontWeight: "600", lineHeight: 24, textAlign: "center" },
  topicActionRow: { alignSelf: "center", gap: 12, marginTop: 10, width: "82%" },
  resourceBanner: { alignItems: "center", backgroundColor: "#F3F6F9", borderRadius: 0, height: 236, justifyContent: "center", marginHorizontal: -20, overflow: "hidden" },
  videoPlayer: { backgroundColor: "#CFCFCF", borderRadius: 0, height: 270, marginHorizontal: -20 },
  videoPlayerShell: { backgroundColor: "#111827", borderRadius: 22, height: 236, marginTop: 18, overflow: "hidden", position: "relative" },
  videoView: { height: "100%", width: "100%" },
  subtitleOverlay: { alignSelf: "center", backgroundColor: "rgba(17,24,39,0.78)", borderRadius: 10, bottom: 16, left: 14, paddingHorizontal: 12, paddingVertical: 8, position: "absolute", right: 14 },
  subtitleText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", lineHeight: 20, textAlign: "center" },
  videoUnavailable: { alignItems: "center", backgroundColor: "#111827", borderRadius: 22, gap: 8, marginTop: 18, minHeight: 180, justifyContent: "center", padding: 18 },
  videoUnavailableTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", textAlign: "center" },
  videoUnavailableCopy: { color: "#D1D5DB", fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  articleHero: { backgroundColor: "#D1D5DB", borderRadius: 0, height: 270, marginHorizontal: -20 },
  reactionRow: { flexDirection: "row", gap: 18, justifyContent: "flex-end", marginTop: 12 },
  reactionButton: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB", borderRadius: 999, borderWidth: 1, fontSize: 19, height: 44, lineHeight: 42, overflow: "hidden", textAlign: "center", width: 58 },
  resourceTitle: { color: "#111827", fontSize: 28, fontWeight: "800", lineHeight: 35 },
  resourceSubtitle: { color: "#3F4B5F", fontSize: 17, fontWeight: "500", lineHeight: 26 },
  assetMetaText: { color: "#6B7280", fontSize: 13, fontWeight: "900", letterSpacing: 0, marginTop: 12, textTransform: "uppercase" },
  articleBody: { color: "#374151", fontSize: 15, lineHeight: 24, marginTop: 18 },
  resourceBottomCta: { marginTop: "auto", paddingTop: 24 },
  flashIntroHero: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E9D5FF", borderRadius: 18, borderWidth: 1, gap: 14, minHeight: 330, padding: 22, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  flashIntroLanding: { alignItems: "center", flex: 1, justifyContent: "center", gap: 18, paddingVertical: 34 },
  flashIntroBanner: { alignItems: "center", borderRadius: 18, height: 210, justifyContent: "center", overflow: "hidden", width: "100%" },
  flashIntroImage: { alignItems: "center", borderRadius: 999, height: 190, justifyContent: "center", width: 190 },
  flashIntroIcon: { color: "#3B0764", fontSize: 82, fontWeight: "900" },
  flashIntroTitle: { color: "#111827", fontSize: 27, fontWeight: "800", lineHeight: 34, textAlign: "center" },
  flashIntroCopy: { color: "#374151", fontSize: 16, fontWeight: "600", lineHeight: 24, textAlign: "center" },
  flashIntroMeta: { color: "#6B7280", fontSize: 14, fontWeight: "800", textAlign: "center" },
  flashProgressTrack: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 4, overflow: "hidden" },
  flashProgressFill: { backgroundColor: "#C026D3", borderRadius: 999, height: 4 },
  player: { alignItems: "center", borderRadius: 28, height: 210, justifyContent: "center" },
  playerIcon: { fontSize: 58, fontWeight: "900" },
  flashcard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E9D5FF", borderRadius: 18, borderWidth: 1, justifyContent: "space-between", minHeight: 420, padding: 26, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  flashcardAnswer: { backgroundColor: "#F1E4FF", borderColor: "#C026D3" },
  flashCount: { color: "#C026D3", fontSize: 17, fontWeight: "900" },
  flipHint: { color: "#C026D3", fontSize: 16, fontWeight: "800" },
  flashText: { color: "#111827", fontSize: 20, fontWeight: "800", lineHeight: 30, textAlign: "center" },
  quizLandingHero: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 18, borderWidth: 1, gap: 13, marginTop: 22, minHeight: 360, padding: 22, shadowColor: "#22304A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  quizHeroVisual: { alignItems: "center", borderRadius: 22, height: 170, justifyContent: "center", marginBottom: 6, overflow: "hidden", width: "100%" },
  quizHeroBadge: { alignSelf: "flex-start", backgroundColor: "#EFE7FF", borderRadius: 999, color: "#3B0764", fontSize: 14, fontWeight: "900", paddingHorizontal: 14, paddingVertical: 8 },
  quizHeroTitle: { color: "#111827", fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: "auto" },
  quizHeroCopy: { color: "#374151", fontSize: 16, fontWeight: "600", lineHeight: 25 },
  quizCount: { color: "#4C1D95", fontSize: 14, fontWeight: "900", marginTop: 20 },
  quizPrompt: { color: "#111827", fontSize: 19, fontWeight: "800", lineHeight: 27, marginTop: 8 },
  quizOptions: { gap: 11, marginTop: 20 },
  quizOption: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE3EA", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  quizOptionCorrect: { backgroundColor: "#ECFDF3", borderColor: "#35B34A" },
  quizOptionWrong: { backgroundColor: "#FEF2F2", borderColor: "#D53F3F" },
  quizOptionText: { color: "#111827", flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 21 },
  quizCorrect: { color: "#35B34A", fontSize: 18, fontWeight: "900" },
  quizWrong: { color: "#D53F3F", fontSize: 18, fontWeight: "900" },
  quizLearnMore: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 14 },
  quizLearnMoreText: { color: "#374151", fontSize: 14, fontWeight: "700", lineHeight: 21 },
  quizResultWrap: { alignItems: "center", flex: 1, justifyContent: "center", gap: 16, paddingVertical: 34 },
  quizResultIcon: { backgroundColor: "#F1D8FF", borderRadius: 999, fontSize: 80, height: 170, lineHeight: 165, overflow: "hidden", textAlign: "center", width: 170 },
  quizResultTitle: { color: "#111827", fontSize: 29, fontWeight: "900", lineHeight: 35, textAlign: "center" },
  quizResultCopy: { color: "#374151", fontSize: 17, fontWeight: "600", lineHeight: 26, textAlign: "center" },
  quizFeedbackTitle: { color: "#111827", fontSize: 14, fontWeight: "800", marginTop: 16 },
  reactionRowCentered: { flexDirection: "row", gap: 16, justifyContent: "center" },
  backToTopicLink: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  backToTopicText: { color: "#3B0764", fontSize: 15, fontWeight: "900", textDecorationLine: "underline" },
  searchPanel: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, gap: 12, padding: 14, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  tutorCard: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 17, borderWidth: 1, gap: 11, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  tutorCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tutorGridCard: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 17, borderWidth: 1, gap: 8, minHeight: 170, padding: 13, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, width: "48%" },
  tutorGridName: { color: "#202A35", fontSize: 15, fontWeight: "900", lineHeight: 20 },
  tutorGridMeta: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  tutorGridFooter: { color: "#202A35", fontSize: 11, fontWeight: "900", lineHeight: 15, marginTop: "auto" },
  filterModalBackdrop: { backgroundColor: "rgba(15,23,42,0.58)", flex: 1, justifyContent: "flex-end", padding: 14 },
  filterModalCard: { backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, gap: 14, maxHeight: "88%", padding: 16 },
  filterModalTitle: { color: "#202A35", fontSize: 20, fontWeight: "900", lineHeight: 26 },
  filterTabs: { backgroundColor: "#F3F6FA", borderRadius: 14, flexDirection: "row", gap: 6, padding: 5 },
  filterTab: { alignItems: "center", borderRadius: 10, flex: 1, minHeight: 38, justifyContent: "center" },
  filterTabText: { color: "#536A86", fontSize: 12, fontWeight: "900" },
  filterFieldStack: { gap: 10 },
  tutorHeaderRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  tutorName: { color: "#111827", fontSize: 19, fontWeight: "800", lineHeight: 24 },
  tutorHeadline: { color: "#536A86", fontSize: 13, fontWeight: "700", lineHeight: 18 },
  ratingBadge: { backgroundColor: "#ECFEFF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  ratingText: { color: "#075985", fontSize: 12, fontWeight: "900" },
  tutorMeta: { color: "#465A74", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  tutorBio: { color: "#111827", fontSize: 14, fontWeight: "500", lineHeight: 21 },
  batchMiniCard: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 14, borderWidth: 1, gap: 8, padding: 12 },
  marketplaceFocusedCard: { borderColor: "#B889F2", borderWidth: 2, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14 },
  marketplaceFocusLabel: { alignSelf: "flex-start", backgroundColor: "#F3E8FF", borderRadius: 999, color: "#6B21A8", fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  batchTitle: { color: "#111827", fontSize: 15, fontWeight: "900", lineHeight: 20 },
  batchMeta: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  requestActionGrid: { gap: 8, marginTop: 10 },
  supplyStatsRow: { flexDirection: "row", gap: 10 },
  supplyStatCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, flex: 1, padding: 14 },
  supplyStatValue: { color: "#202A35", fontSize: 26, fontWeight: "900", lineHeight: 31 },
  supplyStatLabel: { color: "#536A86", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  supplyBuilderCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 10, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  supplyBatchCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 12, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  supplyActionRow: { gap: 8 },
  batchRequestCard: { alignItems: "stretch", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 10, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12 },
  pressablePressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  accountInviteCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, gap: 10, padding: 15 },
  activationCodeText: { color: "#202A35", fontSize: 30, fontWeight: "900", letterSpacing: 6, textAlign: "center" },
  activationTimerText: { color: "#536A86", fontSize: 12, fontWeight: "900", textAlign: "center" },
  parentRow: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#DDE7EF", borderRadius: 14, borderWidth: 1, padding: 13 },
  parentRowName: { color: "#202A35", fontSize: 15, fontWeight: "900" },
  parentRowMeta: { color: "#536A86", fontSize: 12, fontWeight: "700", marginTop: 2 },
  monitoringCard: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#DDE7EF", borderRadius: 20, borderWidth: 1, gap: 12, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  monitoringHeaderRow: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  monitoringChildName: { color: "#202A35", fontSize: 18, fontWeight: "900", lineHeight: 23 },
  monitoringMeta: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  monitoringScorePill: { alignItems: "center", borderRadius: 999, minWidth: 54, paddingHorizontal: 12, paddingVertical: 8 },
  monitoringScoreText: { fontSize: 13, fontWeight: "900" },
  monitoringProgressBox: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, gap: 7, padding: 12 },
  monitoringSummaryGrid: { flexDirection: "row", gap: 9 },
  monitoringMiniBox: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, flex: 1, gap: 2, minHeight: 70, padding: 11 },
  monitoringMiniValue: { color: "#202A35", fontSize: 20, fontWeight: "900", lineHeight: 25 },
  monitoringMiniLabel: { color: "#536A86", fontSize: 11, fontWeight: "800", lineHeight: 15 },
  monitoringInfoRow: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 14, borderWidth: 1, gap: 3, padding: 12 },
  monitoringInfoTitle: { color: "#202A35", fontSize: 14, fontWeight: "900", lineHeight: 19 },
  monitoringInfoMeta: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  monitoringAlertStack: { gap: 8 },
  monitoringAlert: { backgroundColor: "#ECFEFF", borderColor: "#BAE6FD", borderRadius: 13, borderWidth: 1, gap: 3, padding: 11 },
  monitoringAlertTitle: { color: "#075985", fontSize: 12, fontWeight: "900", lineHeight: 16 },
  monitoringAlertCopy: { color: "#334155", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  monitoringPlaceholderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monitoringPlaceholder: { backgroundColor: "#F1F5F9", borderRadius: 999, color: "#64748B", fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 },
  batchAlertCard: { backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, gap: 8, padding: 14, paddingRight: 44, position: "relative", shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 1 },
  suggestedBatchBox: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 13, borderWidth: 1, gap: 4, padding: 10 },
  suggestedBatchLabel: { color: "#6B21A8", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  requestTimeline: { gap: 6, paddingTop: 2 },
  timelineStep: { alignItems: "center", flexDirection: "row", gap: 8 },
  timelineDot: { backgroundColor: "#E2E8F0", borderRadius: 999, height: 9, width: 9 },
  timelineDotDone: { backgroundColor: "#16A34A" },
  timelineDotCurrent: { backgroundColor: "#8B5CF6" },
  timelineText: { color: "#64748B", flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 16 },
  timelineTextCurrent: { color: "#202A35" },
  alertClose: { alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 999, height: 30, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 30, zIndex: 2 },
  alertCloseText: { color: "#111827", fontSize: 18, fontWeight: "900", lineHeight: 20 },
  classRosterHero: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 20, borderWidth: 1, gap: 7, padding: 16, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  classRosterCount: { color: "#075985", fontSize: 13, fontWeight: "900", lineHeight: 18, marginTop: 4 },
  rosterStudentRow: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 13 },
  rosterStudentCard: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, gap: 10, padding: 13 },
  rosterStudentRowInner: { alignItems: "center", flexDirection: "row", gap: 12 },
  rosterAvatar: { alignItems: "center", backgroundColor: "#ECFEFF", borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  rosterAvatarText: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  learnerProgressBox: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, gap: 6, padding: 10 },
  learnerProgressTitle: { color: "#202A35", flex: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 },
  learnerProgressPercent: { color: "#075985", fontSize: 12, fontWeight: "900" },
  learnerProgressTrack: { backgroundColor: "#E2E8F0", borderRadius: 999, height: 6, overflow: "hidden" },
  learnerProgressFill: { backgroundColor: "#22C55E", borderRadius: 999, height: 6 },
  classTile: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#DDE7EF", borderRadius: 17, borderWidth: 1, gap: 7, padding: 15, shadowColor: "#22304A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  classTitle: { color: "#111827", fontSize: 18, fontWeight: "900", lineHeight: 23 },
  classMeta: { color: "#465A74", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  classLink: { color: "#035C67", fontSize: 13, fontWeight: "900", lineHeight: 19 },
  classLocked: { color: "#8B95A1", fontSize: 12, fontWeight: "800", lineHeight: 18 },
  classActionText: { color: "#075985", fontSize: 13, fontWeight: "900", marginTop: 4 },
  nav: { backgroundColor: "#EDEBEB", alignItems: "center", borderColor: "rgba(255,255,255,0.08)", borderRadius: 30, borderWidth: 1, bottom: 18, flexDirection: "row", justifyContent: "space-between", left: 16, minHeight: 64, paddingHorizontal: 12, paddingVertical: 8, position: "absolute", right: 16, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  navItem: { alignItems: "center", flex: 1, gap: 3, minWidth: 0 },
  navIcon: { fontSize: 24, fontWeight: "900", height: 25, lineHeight: 25, textAlign: "center", width: 25 },
  navSvgIcon: { height: 24, width: 24 },
  navText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.1, lineHeight: 12, textAlign: "center" }
});
