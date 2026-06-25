import { appConfig, isFeatureEnabled } from "@mytution/config";
import type { Persona, ProgramMilestone, ProgramSummary, Recommendation, Reminder, Role } from "@mytution/shared";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { roleValueProps, personas, programMilestones, recommendations } from "@/data/mockData";
import { useRoleTheme } from "@/theme/useRoleTheme";

type AppScreen =
  | "role"
  | "value"
  | "phone"
  | "otp"
  | "createPassword"
  | "mpin"
  | "profile"
  | "editProfile"
  | "signin"
  | "signinCredentials"
  | "home"
  | "search"
  | "sessions"
  | "payments"
  | "roleHub"
  | "chat"
  | "account"
  | "events"
  | "resource"
  | "flashIntro"
  | "flashPlay"
  | "ratings";

const splash = require("../assets/splash-screen.png");
const icon = require("../assets/AppIcons/appstore.png");

type StreamKey = "junior" | "senior" | "ug" | "pg";
type AuthSession = { accessToken: string; refreshToken: string; tokenType: string };
type DashboardCard = { value: string; label: string; target: AppScreen };
type SelectedActivity = Recommendation & { milestoneId?: string; activityId?: string; activitySequence?: number; milestoneSequence?: number };
type SignInMode = "fresh" | "returning";
type ProfileDraft = {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  communicationAddress: string;
  alternatePhone: string;
};

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

const flashcards = [
  ["What is the standard form of a quadratic equation?", "ax² + bx + c = 0, where a is not 0."],
  ["What does the discriminant tell us?", "b² - 4ac tells the nature of roots."],
  ["When are roots real and equal?", "When the discriminant is 0."],
  ["When are roots real and distinct?", "When the discriminant is greater than 0."],
  ["When are roots imaginary?", "When the discriminant is less than 0."],
  ["What is factorisation used for?", "To express a quadratic as product of two linear factors."],
  ["What is completing the square?", "A way to rewrite a quadratic into square form."],
  ["What is the quadratic formula?", "x = (-b ± √(b² - 4ac)) / 2a."],
  ["Why graph a quadratic?", "To inspect roots, vertex, and direction visually."],
  ["What is the vertex?", "The turning point of the parabola."]
];

export default function Index() {
  const [role, setRole] = useState<Role>("student");
  const [screen, setScreen] = useState<AppScreen>("signin");
  const [signInMode, setSignInMode] = useState<SignInMode>("fresh");
  const [valueIndex, setValueIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSeconds, setOtpSeconds] = useState(60);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [securityReturn, setSecurityReturn] = useState<"registration" | "signin" | "account">("registration");
  const [stream, setStream] = useState<StreamKey>("senior");
  const [specialization, setSpecialization] = useState("CBSE Class 10 Mathematics");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    firstName: "",
    lastName: "",
    dob: "",
    city: "",
    communicationAddress: "",
    alternatePhone: ""
  });
  const [apiNotice, setApiNotice] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [apiPersona, setApiPersona] = useState<Persona | null>(null);
  const [apiRecommendations, setApiRecommendations] = useState<Recommendation[] | null>(null);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[] | null>(null);
  const [apiMilestones, setApiMilestones] = useState<ProgramMilestone[] | null>(null);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [draftProgramId, setDraftProgramId] = useState<string | null>(null);
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [programModalSeen, setProgramModalSeen] = useState(false);
  const [programPreparing, setProgramPreparing] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);
  const [programRefreshKey, setProgramRefreshKey] = useState(0);
  const [programToast, setProgramToast] = useState("");
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState("Math revision reminder");
  const [reminderDate, setReminderDate] = useState("24/06/2026");
  const [reminderTime, setReminderTime] = useState("06:30 PM");
  const [picker, setPicker] = useState<null | { target: "dob" | "reminderDate" | "reminderTime"; mode: "date" | "time"; value: Date }>(null);
  const [recommendationsReady, setRecommendationsReady] = useState(false);
  const [selectedResource, setSelectedResource] = useState<SelectedActivity | null>(null);
  const [completedTopic, setCompletedTopic] = useState<null | { milestoneId: string; nextActivity?: SelectedActivity; milestoneComplete: boolean }>(null);
  const [completedRecommendations, setCompletedRecommendations] = useState<string[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashAnswer, setFlashAnswer] = useState(false);
  const [completedMilestone, setCompletedMilestone] = useState(0);
  const programTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useRoleTheme(role);
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const phoneForApi = `+91${phoneDigits.slice(-10)}`;
  const phoneComplete = phoneDigits.length === 10;
  const otpComplete = otp.every((digit) => /^\d$/.test(digit));
  const otpValue = otp.join("");
  const mpinValid = /^\d{4,6}$/.test(mpin) && mpin === confirmMpin;
  const passwordValid = password.length >= 8 && password === confirmPassword;
  const emptyPersona = useMemo<Persona>(() => ({
    role,
    firstName: "",
    lastName: "",
    initials: role.charAt(0).toUpperCase(),
    phone: phoneForApi,
    profileLabel: `${capitalize(role)} • myTution`
  }), [phoneForApi, role]);
  const persona = (authSession || screen === "signin") && apiPersona?.role === role ? apiPersona : emptyPersona;

  const roleRecommendations = useMemo(
    () => (apiRecommendations ?? recommendations.filter((item) => item.role === role)).filter((item) => !completedRecommendations.includes(item.id)),
    [apiRecommendations, completedRecommendations, role]
  );

  const roleReminders = reminders.filter((item) => item.role === role && item.status === "active");

  useEffect(() => {
    if (screen !== "otp") return undefined;
    setOtpSeconds(60);
    const timer = setInterval(() => setOtpSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "home") return undefined;
    setRecommendationsReady(false);
    const timer = setTimeout(() => setRecommendationsReady(true), 1600);
    return () => clearTimeout(timer);
  }, [screen, role]);

  useEffect(() => {
    if (screen !== "sessions" || programModalSeen || !programs.length) return;
    setDraftProgramId(selectedProgramId ?? programs[0]?.id ?? null);
    setProgramMenuOpen(false);
    setProgramModalVisible(true);
  }, [programModalSeen, programs, screen, selectedProgramId]);

  useEffect(() => {
    if (!programToast) return undefined;
    const timer = setTimeout(() => setProgramToast(""), 3000);
    return () => clearTimeout(timer);
  }, [programToast]);

  useEffect(() => () => {
    if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
  }, []);

  function prepareProgram(nextProgramId?: string | null) {
    const resolvedProgramId = nextProgramId ?? draftProgramId ?? selectedProgramId ?? programs[0]?.id ?? null;
    if (!resolvedProgramId) return;
    if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
    setProgramPreparing(true);
    setPendingProgramId(resolvedProgramId);
    setProgramMenuOpen(false);
    setSelectedProgramId(resolvedProgramId);
    setProgramRefreshKey((value) => value + 1);
    programTimeoutRef.current = setTimeout(() => {
      setProgramPreparing(false);
      setPendingProgramId(null);
      setProgramToast("Program setup timed out. Please try again.");
    }, 15000);
  }

  function openProgramPicker() {
    setDraftProgramId(selectedProgramId ?? programs[0]?.id ?? null);
    setProgramMenuOpen(false);
    setProgramModalVisible(true);
  }

  useEffect(() => {
    let ignore = false;
    async function loadRoleData() {
      try {
        const token = authSession?.accessToken;
        const [bootstrap, recs, eventData, dashboard, programList] = await Promise.all([
          apiGet<{ persona: Persona }>(`/api/v1/bootstrap?role=${role}`, token),
          apiGet<{ data: Recommendation[] }>(`/api/v1/recommendations?role=${role}`),
          token ? apiGet<{ data: Reminder[] }>(`/api/v1/events-reminders?role=${role}`, token) : Promise.resolve({ data: [] }),
          token ? apiGet<{ data: { cards: DashboardCard[] } }>(`/api/v1/dis/dashboard?role=${role}`, token) : Promise.resolve({ data: { cards: [] } }),
          apiGet<{ data: ProgramSummary[] }>(`/api/v1/education-plan/programs?role=${role}`)
        ]);
        const programId = selectedProgramId ?? programList.data[0]?.id ?? null;
        const plan = programId
          ? await apiGet<{ data: { milestones: ProgramMilestone[]; completedMilestoneSequence: number } }>(`/api/v1/education-plan/current?role=${role}&programId=${programId}`, token)
          : { data: { milestones: [], completedMilestoneSequence: 0 } };
        if (ignore) return;
        setApiPersona(token ? bootstrap.persona : null);
        setApiRecommendations(recs.data);
        setReminders(eventData.data);
        setDashboardCards(dashboard.data.cards);
        setPrograms(programList.data);
        setSelectedProgramId(programId);
        setApiMilestones(plan.data.milestones);
        setCompletedMilestone(plan.data.completedMilestoneSequence);
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
        setApiRecommendations(null);
        setDashboardCards(null);
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
  }, [role, authSession?.accessToken, selectedProgramId, programRefreshKey, pendingProgramId]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setAvatarUri(result.assets[0]?.uri ?? null);
  }

  function restartPrototype() {
    setRole("student");
    setPhoneNumber("");
    setProfileDraft({ firstName: "", lastName: "", dob: "", city: "", communicationAddress: "", alternatePhone: "" });
    setValueIndex(0);
    setConsent(false);
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
    setSigninPassword("");
    setMpin("");
    setConfirmMpin("");
    setBiometricsEnabled(true);
    setSecurityReturn("registration");
    setStream("senior");
    setSpecialization("CBSE Class 10 Mathematics");
    setAvatarUri(null);
    setReminders([]);
    setApiPersona(null);
    setApiRecommendations(null);
    setDashboardCards(null);
    setApiMilestones(null);
    setPrograms([]);
    setSelectedProgramId(null);
    setAuthSession(null);
    setApiNotice("");
    setSignInMode("fresh");
    setScreen("signin");
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
        profile: {
          firstName: profileDraft.firstName.trim(),
          lastName: profileDraft.lastName.trim(),
          dob: profileDraft.dob.trim(),
          city: profileDraft.city.trim(),
          communicationAddress: profileDraft.communicationAddress.trim(),
          alternatePhone: profileDraft.alternatePhone.trim(),
          stream,
          specialization
        }
      });
      setAuthSession(response.data);
      setApiPersona({
        role,
        firstName: profileDraft.firstName.trim(),
        lastName: profileDraft.lastName.trim(),
        initials: `${profileDraft.firstName.charAt(0)}${profileDraft.lastName.charAt(0)}`.toUpperCase() || role.charAt(0).toUpperCase(),
        phone: phoneForApi,
        profileLabel: role === "parent" ? "Parent • myTution" : `${capitalize(role)} • ${stream} • ${specialization}`
      });
      setApiNotice("");
      setScreen("home");
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
      setSecurityReturn("signin");
      setMpin("");
      setConfirmMpin("");
      setApiNotice("");
      setScreen("mpin");
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
    try {
      const response = await apiPost<{ data: Reminder }>("/api/v1/events-reminders", {
        role,
        title: optimistic.title,
        startsAt
      }, authSession?.accessToken);
      setReminders((items) => items.map((item) => item.id === optimistic.id ? response.data : item));
    } catch {
      setApiNotice("Reminder saved locally. API write failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  function editReminder(reminder: Reminder) {
    setReminderTitle(reminder.title);
    setReminderDate(reminder.startsAt.split(" ")[0] || reminderDate);
    setReminderTime(reminder.startsAt.split(" ").slice(1).join(" ") || reminderTime);
    setReminders((items) => items.filter((item) => item.id !== reminder.id));
    setScreen("home");
  }

  async function deleteReminder(id: string) {
    setReminders((items) => items.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
    try {
      await apiDelete(`/api/v1/events-reminders/${id}`, authSession?.accessToken);
    } catch {
      setApiNotice("Reminder deleted locally. API write failed.");
    }
  }

  function openResource(resource: SelectedActivity) {
    setSelectedResource(resource);
    setScreen(resource.type === "flashcard" ? "flashIntro" : "resource");
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

  function openMilestoneActivity(milestone: ProgramMilestone) {
    const nextActivity = milestone.activities?.find((activity) => activity.status !== "complete") ?? milestone.activities?.[0];
    if (!nextActivity) {
      openResource({ id: milestone.id, role, type: "video", title: milestone.title, description: "Video • Article • Flashcard • Quiz", thumbnailLabel: "Milestone", milestoneId: milestone.id, milestoneSequence: milestone.sequence });
      return;
    }
    openResource(activityToResource(nextActivity, milestone));
  }

  function getNextMilestoneActivity(currentMilestoneId?: string): SelectedActivity | undefined {
    const milestones = apiMilestones ?? programMilestones;
    const currentMilestone = milestones.find((milestone) => milestone.id === currentMilestoneId);
    const nextMilestone = milestones.find((milestone) => milestone.sequence === (currentMilestone?.sequence ?? 0) + 1);
    const nextActivity = nextMilestone?.activities?.find((activity) => activity.status !== "complete") ?? nextMilestone?.activities?.[0];
    return nextMilestone && nextActivity ? activityToResource(nextActivity, { ...nextMilestone, locked: false }) : undefined;
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
      if (milestoneComplete && selectedResource.milestoneId) {
        setCompletedMilestone((value) => Math.max(value, selectedResource.milestoneSequence ?? value));
        setCompletedTopic({ milestoneId: selectedResource.milestoneId, nextActivity: getNextMilestoneActivity(selectedResource.milestoneId), milestoneComplete });
        return;
      }
      setSelectedResource(null);
      if (nextActivity) {
        openResource(nextActivity);
      } else {
        setScreen("sessions");
      }
      return;
    }
    setLoadingAction(null);
  }

  function renderScreen() {
    if (screen === "role") {
      return (
        <>
          {(["student", "tutor", "parent"] as Role[]).map((item) => (
            <Card key={item} role={role} selected={role === item} onPress={() => {
              setRole(item);
              setPhoneNumber("");
              setProfileDraft({ firstName: "", lastName: "", dob: "", city: "", communicationAddress: "", alternatePhone: "" });
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
          <Button role={role} label="Continue" onPress={() => { setValueIndex(0); setScreen("value"); }} />
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
            <View style={[styles.propArt, { backgroundColor: theme.accent }]}>
              <Text style={[styles.propIcon, { color: theme.text }]}>{prop.icon}</Text>
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
          <Button disabled={!passwordValid} role={role} label="Continue" onPress={() => { setSecurityReturn("registration"); setScreen("mpin"); }} />
        </>
      );
    }

    if (screen === "mpin") {
      const signInMpin = securityReturn === "signin";
      const canContinue = signInMpin ? mpin.length >= 4 : mpinValid;
      return (
        <>
          <TopBar title="Security" left="‹" onLeft={() => setScreen(securityReturn === "account" ? "account" : securityReturn === "signin" ? "signinCredentials" : "createPassword")} />
          <Title>{signInMpin ? "Enter app MPIN" : "Set app MPIN"}</Title>
          <Muted>{signInMpin ? "Enter your local app MPIN to continue." : "Your MPIN protects account, booking, and payment actions."}</Muted>
          <FieldLabel>{signInMpin ? "MPIN" : "Create MPIN"}</FieldLabel>
          <SecureField role={role} value={mpin} onChangeText={setMpin} visible={showMpin} onToggle={() => setShowMpin(!showMpin)} placeholder="Create MPIN" />
          {!signInMpin && (
            <>
              <FieldLabel>Confirm MPIN</FieldLabel>
              <SecureField role={role} value={confirmMpin} onChangeText={setConfirmMpin} visible={showMpin} onToggle={() => setShowMpin(!showMpin)} placeholder="Confirm MPIN" />
              <Muted>{mpinValid ? "MPIN confirmed." : "Enter matching 4-6 digit MPIN values."}</Muted>
              <Pressable style={styles.biometricCard} onPress={() => setBiometricsEnabled(!biometricsEnabled)}>
                <View style={styles.flex}>
                  <Text style={styles.biometricTitle}>Enable biometrics</Text>
                  <Text style={styles.biometricCopy}>Use Face ID or fingerprint where available.</Text>
                </View>
                <View style={[styles.smallCheck, biometricsEnabled && { backgroundColor: "#2563EB", borderColor: "#2563EB" }]}>
                  <Text style={styles.smallCheckText}>{biometricsEnabled ? "✓" : ""}</Text>
                </View>
              </Pressable>
            </>
          )}
          <Button disabled={!canContinue} role={role} label="Continue" onPress={() => setScreen(securityReturn === "account" ? "account" : securityReturn === "signin" ? "home" : "profile")} />
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
                specialization
              }, authSession?.accessToken);
              setApiPersona({
                role,
                firstName: profileDraft.firstName.trim(),
                lastName: profileDraft.lastName.trim(),
                initials: `${profileDraft.firstName.charAt(0)}${profileDraft.lastName.charAt(0)}`.toUpperCase() || role.charAt(0).toUpperCase(),
                phone: phoneForApi,
                profileLabel: role === "parent" ? "Parent • myTution" : `${capitalize(role)} • ${stream} • ${specialization}`
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
      return <SignInScreen role={role} mode={signInMode} persona={persona} avatarUri={avatarUri} restart={restartPrototype} signIn={() => setScreen(signInMode === "fresh" ? "signinCredentials" : "home")} register={() => setScreen("role")} />;
    }

    if (screen === "signinCredentials") {
      return (
        <>
          <TopBar title="Sign in" left="‹" onLeft={() => setScreen("signin")} />
          <Title>Sign in with phone</Title>
          <Muted>Enter your registered phone number and password.</Muted>
          <FieldLabel>Phone number</FieldLabel>
          <Input
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
          />
          <FieldLabel>Password</FieldLabel>
          <Input secureTextEntry value={signinPassword} onChangeText={setSigninPassword} placeholder="Password" />
          {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
          <View style={styles.bottomCta}>
            <Button disabled={!phoneComplete || !signinPassword} loading={loadingAction === "signin"} role={role} label="Next" onPress={signInWithPassword} />
          </View>
        </>
      );
    }

    if (screen === "home") {
      return (
        <>
          <Header role={role} personaName={`${persona.firstName} ${persona.lastName}`} />
          {apiNotice ? <Text style={styles.apiNotice}>{apiNotice}</Text> : null}
          <TrackCard role={role} onPress={() => setScreen(role === "student" ? "search" : "sessions")} />

          {isFeatureEnabled("recommendations", role) && (
            <>
              {!recommendationsReady ? (
                <View style={styles.smartPickCard}>
                  <ActivityIndicator color={theme.accentStrong} />
                  <Muted>Loading smart picks</Muted>
                </View>
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
            <>
              {roleReminders.slice(0, 2).map((item) => (
                <ReminderSummary
                  key={item.id}
                  role={role}
                  reminder={item}
                  onEdit={() => editReminder(item)}
                  onDelete={() => deleteReminder(item.id)}
                />
              ))}
      <Pressable style={({ pressed }) => [styles.viewAllCard, pressed && styles.pressed]} onPress={() => setScreen("events")}>
                <Text style={[styles.viewAllText, { color: theme.text }]}>View all reminders</Text>
              </Pressable>
            </>
          )}

          <SectionTitle>Dashboard</SectionTitle>
          <DashboardGrid role={role} cards={dashboardCards} setScreen={setScreen} />
        </>
      );
    }

    if (screen === "search") return <SimpleScreen title="Tutor discovery" role={role} back={() => setScreen("home")} />;
    if (screen === "payments") return <Payments role={role} back={() => setScreen("account")} />;
    if (screen === "roleHub") return <RoleHub role={role} back={() => setScreen("home")} />;
    if (screen === "chat") return <Chat role={role} back={() => setScreen("home")} />;
    if (screen === "account") return <Account role={role} persona={persona} avatarUri={avatarUri} signOut={async () => { if (authSession) await apiPost("/api/v1/auth/revoke", { refreshToken: authSession.refreshToken }, authSession.accessToken).catch(() => undefined); setAuthSession(null); setSignInMode("returning"); setScreen("signin"); }} setScreen={setScreen} openSecurity={() => { setSecurityReturn("account"); setScreen("mpin"); }} />;
    if (screen === "ratings") return <Ratings role={role} back={() => setScreen("home")} />;
    if (screen === "events") return <Events role={role} reminders={roleReminders} editReminder={editReminder} deleteReminder={deleteReminder} back={() => setScreen("home")} />;
    if (screen === "sessions") return <Sessions role={role} programs={programs} selectedProgramId={selectedProgramId} milestones={apiMilestones ?? programMilestones} completedMilestone={completedMilestone} openMilestoneActivity={openMilestoneActivity} menuOpen={programMenuOpen} setMenuOpen={setProgramMenuOpen} openProgramPicker={openProgramPicker} archiveProgram={() => { setProgramMenuOpen(false); setProgramToast("Program archived."); }} />;
    if (screen === "resource" && selectedResource) return <ResourceDetail role={role} resource={selectedResource} complete={markComplete} loading={loadingAction === "markComplete"} back={() => setScreen("sessions")} completedTopic={completedTopic} nextTopic={() => { const next = completedTopic?.nextActivity; setCompletedTopic(null); if (next) openResource(next); }} myMiles={() => { setCompletedTopic(null); setSelectedResource(null); setScreen("sessions"); }} />;
    if (screen === "flashIntro" && selectedResource) return <FlashIntro role={role} resource={selectedResource} start={() => { setFlashIndex(0); setFlashAnswer(false); setScreen("flashPlay"); }} back={() => setScreen("home")} />;
    if (screen === "flashPlay") return <FlashPlay role={role} index={flashIndex} answer={flashAnswer} setAnswer={setFlashAnswer} next={() => { setFlashIndex((flashIndex + 1) % flashcards.length); setFlashAnswer(false); }} learnMore={() => { setSelectedResource({ id: "article_quadratic", role, type: "article", title: "Quadratic equations deep dive", description: "Worked examples, formula use, and exam-style practice.", thumbnailLabel: "Article" }); setScreen("resource"); }} complete={markComplete} />;

    return null;
  }

  const showNav = ["home", "sessions", "roleHub", "chat", "account"].includes(screen);

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
          display="default"
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
        selectedProgramId={draftProgramId ?? selectedProgramId}
        setSelectedProgramId={setDraftProgramId}
        preparing={programPreparing}
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
  signIn,
  register
}: {
  role: Role;
  mode: SignInMode;
  persona: typeof personas[Role];
  avatarUri: string | null;
  restart: () => void;
  signIn: () => void;
  register: () => void;
}) {
  if (mode === "fresh") {
    return (
      <>
        <View style={styles.freshSigninTop}>
          <Image source={icon} style={styles.freshSigninLogo} resizeMode="contain" />
          <Text style={styles.freshSigninBrand}>myTution</Text>
        </View>
        <Button role={role} label="Sign in" onPress={signIn} />
        <Pressable style={({ pressed }) => [styles.registerLink, pressed && styles.pressed]} onPress={register}>
          <Text style={styles.registerLinkText}>Don't have an account? Register Now!!</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <View style={styles.brandRow}>
        <Image source={icon} style={styles.brandIcon} resizeMode="contain" />
        <Text style={styles.brandTitle}>myTution</Text>
      </View>
      <View style={styles.signinCard}>
        <Avatar role={role} label={persona.initials} uri={avatarUri} />
        <View style={styles.flex}>
          <Text style={styles.signinKicker}>Welcome back</Text>
          <Text style={styles.signinName}>{persona.firstName} {persona.lastName}</Text>
        </View>
        <Text style={styles.signinCopy}>{capitalize(role)} dashboard is ready. Sign in with MPIN to continue.</Text>
      </View>
      <FieldLabel>MPIN</FieldLabel>
      <Input secureTextEntry value="1234" onChangeText={() => undefined} />
      <Button role={role} label="Sign in" onPress={signIn} />
      <Button role={role} variant="secondary" label="Restart prototype" onPress={restart} />
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

function SecureField({
  role,
  value,
  onChangeText,
  visible,
  onToggle,
  placeholder
}: {
  role: Role;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  const theme = useRoleTheme(role);
  return (
    <View style={styles.secureShell}>
      <TextInput
        secureTextEntry={!visible}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={styles.secureInput}
      />
      <Pressable style={[styles.eyeButton, { backgroundColor: theme.surface }]} onPress={onToggle}>
        <Text style={[styles.eyeButtonText, { color: theme.text }]}>{visible ? "◉" : "◉"}</Text>
      </Pressable>
    </View>
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
    <View style={[styles.trackCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
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

function RecommendationTile({ role, item, onPress }: { role: Role; item: Recommendation; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const glyph = item.type === "video" ? "▶" : item.type === "article" ? "₹" : "P";
  return (
    <Pressable onPress={onPress} style={styles.recCard}>
      <View style={[styles.thumb, { backgroundColor: theme.surface }]}>
        <Text style={[styles.thumbText, { color: theme.text }]}>{glyph}</Text>
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

function TodayCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const theme = useRoleTheme(role);
  const title = role === "student" ? "Trial with Neha Verma" : role === "tutor" ? "Demo with Apoorv Gulati" : "Trial with Neha Verma";
  const meta = role === "tutor" ? "Tomorrow, 6:00 PM • Online" : "Tomorrow, 6:00 PM • Online";
  return (
    <Pressable style={styles.todayCard} onPress={onPress}>
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
      <Pressable onPress={onLeft} style={styles.topButton}><Text style={styles.topButtonText}>{left ?? ""}</Text></Pressable>
      <Text style={styles.topTitle}>{title}</Text>
      <Pressable onPress={onRight} style={styles.topButton}><Text style={styles.topButtonText}>{right ?? ""}</Text></Pressable>
    </View>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return <View style={styles.hero}>{children}</View>;
}

function Card({ children, role, onPress, selected }: { children: React.ReactNode; role: Role; onPress?: () => void; selected?: boolean }) {
  const theme = useRoleTheme(role);
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && { borderColor: theme.accentStrong, backgroundColor: theme.surface }]}>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.metric, pressed && styles.pressed]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Muted>{label}</Muted>
    </Pressable>
  );
}

function DashboardGrid({ role, cards, setScreen }: { role: Role; cards: DashboardCard[] | null; setScreen: (screen: AppScreen) => void }) {
  const metrics: Record<Role, Array<{ value: string; label: string; target: AppScreen }>> = {
    student: [
      { value: "0", label: "My Miles", target: "sessions" },
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

function ReminderSummary({
  role,
  reminder,
  onEdit,
  onDelete,
  compact
}: {
  role: Role;
  reminder: Reminder;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const theme = useRoleTheme(role);
  return (
    <View style={styles.reminderSummaryCard}>
      <View style={styles.reminderSummaryTop}>
        <View style={styles.flex}>
          <Text style={styles.reminderSummaryTitle}>{reminder.title}</Text>
          <Text style={styles.reminderSummaryMeta}>{formatReminderDateTime(reminder.startsAt)}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.roleBadgeText, { color: theme.text }]}>{capitalize(role)}</Text>
        </View>
      </View>
      {!compact && (
        <View style={styles.reminderActionRow}>
          <Pressable style={({ pressed }) => [styles.reminderActionButton, pressed && styles.pressed]} onPress={onEdit}>
            <Text style={[styles.reminderActionText, { color: theme.text }]}>Edit</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.reminderActionButton, pressed && styles.pressed]} onPress={onDelete}>
            <Text style={[styles.reminderActionText, { color: theme.text }]}>Delete</Text>
          </Pressable>
        </View>
      )}
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

function ResourceDetail({ role, resource, complete, loading, back, completedTopic, nextTopic, myMiles }: { role: Role; resource: SelectedActivity; complete: () => void; loading?: boolean; back: () => void; completedTopic: null | { nextActivity?: SelectedActivity; milestoneComplete: boolean }; nextTopic: () => void; myMiles: () => void }) {
  const theme = useRoleTheme(role);
  return (
    <>
      <TopBar title={resource.thumbnailLabel} left="‹" onLeft={back} />
      <View style={[styles.player, { backgroundColor: resource.type === "video" ? "#242424" : theme.accent }]}>
        <Text style={[styles.playerIcon, { color: resource.type === "video" ? "#FFFFFF" : theme.text }]}>{resource.type === "video" ? "▶" : "A"}</Text>
      </View>
      <Title>{resource.title}</Title>
      <Muted>{resource.description}</Muted>
      <Button role={role} label="Mark complete" onPress={complete} loading={loading} />
      {completedTopic ? (
        <View style={styles.topicTrayBackdrop}>
          <View style={styles.topicTray}>
            <View style={styles.trayHandle} />
            <View style={styles.trophyCircle}><Text style={styles.trophyIcon}>🏆</Text></View>
            <Text style={styles.topicCompleteTitle}>Topic complete</Text>
            <Text style={styles.topicCompleteCopy}>Great job finishing this topic. The next topic is now unlocked and ready for you to explore.</Text>
            <View style={styles.topicActionRow}>
              {completedTopic.nextActivity ? <Button role={role} label="Next topic" onPress={nextTopic} /> : null}
              <Button role={role} variant="secondary" label="My Miles" onPress={myMiles} />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

function FlashIntro({ role, resource, start, back }: { role: Role; resource: Recommendation; start: () => void; back: () => void }) {
  return (
    <>
      <TopBar title="Flash cards" left="‹" onLeft={back} />
      <Hero>
        <Text style={styles.propIcon}>▧</Text>
        <Title>{resource.title}</Title>
        <Muted>{resource.description}</Muted>
      </Hero>
      <Button role={role} label="Start flashcard" onPress={start} />
    </>
  );
}

function FlashPlay({ role, index, answer, setAnswer, next, learnMore, complete }: { role: Role; index: number; answer: boolean; setAnswer: (value: boolean) => void; next: () => void; learnMore: () => void; complete: () => void }) {
  return (
    <>
      <TopBar title={`Card ${index + 1} of ${flashcards.length}`} />
      <Pressable style={styles.flashcard} onPress={() => setAnswer(!answer)}>
        <Text style={styles.flashText}>{answer ? flashcards[index][1] : flashcards[index][0]}</Text>
      </Pressable>
      <View style={styles.row}>
        <Button role={role} variant="secondary" label="Learn more" onPress={learnMore} />
        <Button role={role} label="Next" onPress={next} />
      </View>
      <Button role={role} variant="secondary" label="Mark complete" onPress={complete} />
    </>
  );
}

function Sessions({
  role,
  programs,
  selectedProgramId,
  milestones,
  completedMilestone,
  openMilestoneActivity,
  menuOpen,
  setMenuOpen,
  openProgramPicker,
  archiveProgram
}: {
  role: Role;
  programs: ProgramSummary[];
  selectedProgramId: string | null;
  milestones: ProgramMilestone[];
  completedMilestone: number;
  openMilestoneActivity: (milestone: ProgramMilestone) => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  openProgramPicker: () => void;
  archiveProgram: () => void;
}) {
  const theme = useRoleTheme(role);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0];
  const programTitle = selectedProgram?.title ?? (role === "student" ? "Medical program" : role === "tutor" ? "Tutor growth program" : "Parent support program");
  const programDescription = selectedProgram?.description ?? "Milestones unlock one by one. Each topic includes video, article, flashcard, and quiz.";

  return (
    <>
      <View style={styles.milesHeader}>
        <View style={styles.milesHeaderSpacer} />
        <Text style={styles.milesHeaderTitle}>My Miles</Text>
        <Pressable style={styles.headerIconButton} onPress={() => setMenuOpen(!menuOpen)}>
          <Text style={[styles.headerIconButtonText, { color: theme.accentStrong }]}>⋮</Text>
        </Pressable>
        {menuOpen ? (
          <View style={styles.programMenu}>
            <Pressable style={({ pressed }) => [styles.programMenuItem, pressed && styles.pressed]} onPress={openProgramPicker}>
              <Text style={styles.programMenuText}>Add a program</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.programMenuItem, pressed && styles.pressed]} onPress={archiveProgram}>
              <Text style={styles.programMenuText}>Archive a program</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={[styles.milesSummaryCard, { borderColor: theme.accentStrong }]}>
        <Text style={styles.milesSummaryTitle}>{programTitle}</Text>
        <Text style={styles.milesSummaryCopy}>{programDescription}</Text>
      </View>
      <View style={styles.milesTimeline}>
        {milestones.map((milestone, index) => {
          const locked = milestone.sequence > completedMilestone + 1;
          const complete = milestone.sequence <= completedMilestone;
          const active = milestone.sequence === completedMilestone + 1;
          const completeGreen = "#16A34A";
          const activityText = milestone.activities?.length
            ? milestone.activities.map((activity) => capitalize(activity.type)).join(" • ")
            : "Video • Article • Flashcard • Quiz";
          const completedActivities = milestone.activities?.filter((activity) => activity.status === "complete").length ?? (complete ? 4 : 0);
          const totalActivities = milestone.activities?.length ?? 4;
          const progress = complete ? 1 : totalActivities ? completedActivities / totalActivities : 0;
          const hasStarted = completedActivities > 0;
          const ctaLabel = locked ? "Coming soon" : complete ? "Review" : hasStarted ? "Continue" : "Start";
          const chipLabel = !complete && hasStarted ? "Keep learning" : null;

          return (
            <View key={milestone.id} style={styles.mileRow}>
              <View style={styles.mileRail}>
                {index > 0 ? <View style={[styles.mileRailLine, styles.mileRailLineTop, locked ? styles.mileRailLineLocked : { backgroundColor: theme.accentStrong }]} /> : null}
                <View style={[
                  styles.mileNode,
                  locked ? styles.mileNodeLocked : { backgroundColor: complete ? completeGreen : theme.accent, borderColor: complete ? completeGreen : theme.accentStrong }
                ]}>
                  <Text style={[styles.mileNodeText, { color: locked ? "#9CA3AF" : complete ? "#FFFFFF" : theme.text }]}>{locked ? "⌕" : milestone.sequence}</Text>
                </View>
                {index < milestones.length - 1 ? <View style={[styles.mileRailLine, styles.mileRailLineBottom, locked ? styles.mileRailLineLocked : { backgroundColor: theme.accentStrong }]} /> : null}
              </View>
              <Pressable
                disabled={locked}
                onPress={() => {
                  if (locked) return;
                  openMilestoneActivity(milestone);
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
                <Text style={[styles.mileCardTitle, locked ? styles.mileCardTitleLocked : null]}>{milestone.title}</Text>
                {!locked && !complete ? (
                  <>
                    <View style={styles.mileProgressTrack}>
                      <View style={[styles.mileProgressFill, { backgroundColor: theme.accentStrong, width: (String(Math.max(8, Math.round(progress * 100))) + "%") as `${number}%` }]} />
                    </View>
                    <Text style={styles.mileProgressText}>{completedActivities} of {totalActivities} complete</Text>
                  </>
                ) : null}
                {!locked && complete ? <Text style={styles.mileActivityText}>{activityText}</Text> : null}
                <View style={[styles.mileCta, locked ? styles.mileCtaLocked : complete ? styles.mileCtaOutline : { backgroundColor: theme.text, borderColor: theme.text }]}>
                  <Text style={[styles.mileCtaText, { color: locked ? "#8F8A9D" : complete ? theme.text : "#FFFFFF" }]}>{ctaLabel}</Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </>
  );
}

function ProgramPickerModal({
  role,
  visible,
  programs,
  selectedProgramId,
  setSelectedProgramId,
  preparing,
  onContinue
}: {
  role: Role;
  visible: boolean;
  programs: ProgramSummary[];
  selectedProgramId: string | null;
  setSelectedProgramId: (value: string | null) => void;
  preparing: boolean;
  onContinue: () => void;
}) {
  const theme = useRoleTheme(role);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0];
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
              <Text style={styles.programModalTitle}>Choose your program</Text>
              <Text style={styles.programModalCopy}>Select the plan you want to follow in My Miles.</Text>
              <FieldLabel>Program</FieldLabel>
              <DropdownField
                value={selectedProgram?.title ?? "Select program"}
                options={programs.map((program) => program.title)}
                onSelect={(title) => setSelectedProgramId(programs.find((program) => program.title === title)?.id ?? null)}
              />
              <View style={styles.modalBottomCta}>
                <Button role={role} label="Continue" onPress={onContinue} disabled={!selectedProgram} />
              </View>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

function RoleHub({ role, back }: { role: Role; back: () => void }) {
  const title = role === "tutor" ? "My Students" : role === "student" ? "My Tutors" : "My Surveys";
  const items = role === "tutor"
    ? ["No assigned students yet", "New student requests will appear here"]
    : role === "student"
      ? ["No tutors added yet", "Booked and shortlisted tutors will appear here"]
      : ["No surveys yet", "Weekly progress surveys will appear here"];
  return (
    <>
      <TopBar title={title} left="‹" onLeft={back} />
      {items.map((item) => (
        <Card key={item} role={role}>
          <CardTitle>{item}</CardTitle>
          <Muted>{role === "parent" ? "Survey history is empty for this account." : "Start from discovery or bookings to populate this list."}</Muted>
        </Card>
      ))}
    </>
  );
}

function Events({ role, reminders, editReminder, deleteReminder, back }: { role: Role; reminders: Reminder[]; editReminder: (item: Reminder) => void; deleteReminder: (id: string) => void; back: () => void }) {
  return (
    <>
      <TopBar title="Events & reminders" left="‹" onLeft={back} />
      {reminders.length ? reminders.map((item) => (
        <ReminderSummary
          key={item.id}
          role={role}
          reminder={item}
          onEdit={() => editReminder(item)}
          onDelete={() => deleteReminder(item.id)}
        />
      )) : <Muted>No reminders yet.</Muted>}
    </>
  );
}

function Payments({ role, back }: { role: Role; back: () => void }) {
  return (
    <>
      <TopBar title="Payments" left="‹" onLeft={back} />
      <Card role={role}><CardTitle>UPI</CardTitle><Muted>apoorv@upi</Muted></Card>
      <Card role={role}><CardTitle>Visa ending 4242</CardTitle><Muted>Primary card</Muted></Card>
      <Button role={role} label="Add card / UPI" onPress={() => undefined} />
    </>
  );
}

function Chat({ role, back }: { role: Role; back: () => void }) {
  return (
    <>
      <TopBar title="Chat" left="‹" onLeft={back} />
      <Card role={role}><CardTitle>Booking context</CardTitle><Muted>Trial class • Tomorrow 6:00 PM • Online</Muted></Card>
      <Card role={role}><Muted>Hi Apoorv, I can help with algebra and board exam patterns.</Muted></Card>
      <Card role={role}><Muted>Great. Can we start with quadratic equations?</Muted></Card>
      <Input value="Sounds good, thank you!" onChangeText={() => undefined} />
      <Button role={role} label="Send" onPress={() => undefined} />
    </>
  );
}

function Account({
  role,
  persona,
  avatarUri,
  signOut,
  setScreen,
  openSecurity
}: {
  role: Role;
  persona: typeof personas[Role];
  avatarUri: string | null;
  signOut: () => void;
  setScreen: (screen: AppScreen) => void;
  openSecurity: () => void;
}) {
  const theme = useRoleTheme(role);
  return (
    <>
      <View style={styles.accountHeader}>
        <Text style={styles.accountTitle}>My Account</Text>
        <Pressable style={styles.headerIconButton} onPress={() => setScreen("ratings")}><Text style={styles.headerIconButtonText}>⚙</Text></Pressable>
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
      <Button role={role} variant="secondary" label="Edit profile" onPress={() => setScreen("editProfile")} />
      <Button role={role} variant="secondary" label="Payments" onPress={() => setScreen("payments")} />
      <Button role={role} variant="secondary" label="Security" onPress={openSecurity} />
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

function BottomNav({ role, screen, setScreen }: { role: Role; screen: AppScreen; setScreen: (screen: AppScreen) => void }) {
  const theme = useRoleTheme(role);
  const hubLabel = role === "tutor" ? "My Students" : role === "student" ? "My Tutors" : "My Surveys";
  const items: Array<[AppScreen, string, string]> = [
    ["home", "Home", "⌂"],
    ["sessions", "My Miles", "▥"],
    ["roleHub", hubLabel, "▣"],
    ["chat", "Chat", "▤"],
    ["account", "Account", "⌾"]
  ];
  return (
    <View style={styles.nav}>
      {items.map(([id, label, icon]) => (
        <Pressable key={id} style={styles.navItem} onPress={() => setScreen(id)}>
          <Text style={[styles.navIcon, { color: screen === id ? "#FFFFFF" : theme.accentStrong }]}>{icon}</Text>
          <Text style={[styles.navText, { color: screen === id ? "#FFFFFF" : theme.accentStrong }]}>{label}</Text>
        </Pressable>
      ))}
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
  shell: { flex: 1 },
  content: { flexGrow: 1, gap: 14, padding: 20, paddingTop: 58 },
  homeContent: { gap: 16, paddingHorizontal: 16 },
  valueContent: { justifyContent: "space-between" },
  contentWithNav: { paddingBottom: 124 },
  flex: { flex: 1 },
  bottomCta: { flex: 1, justifyContent: "flex-end", minHeight: 260 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerIcon: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 15, fontSize: 18, fontWeight: "900", height: 39, lineHeight: 39, overflow: "hidden", textAlign: "center", width: 39 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  topButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 13, height: 40, justifyContent: "center", width: 40 },
  topButtonText: { color: "#202A35", fontSize: 16, fontWeight: "900" },
  topTitle: { color: "#202A35", fontSize: 16, fontWeight: "900" },
  milesHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 42, position: "relative" },
  milesHeaderSpacer: { height: 39, width: 39 },
  milesHeaderTitle: { color: "#202A35", fontSize: 18, fontWeight: "900", left: 58, position: "absolute", right: 58, textAlign: "center" },
  programMenu: { backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, overflow: "hidden", position: "absolute", right: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 18, top: 46, width: 188, zIndex: 5 },
  programMenuItem: { minHeight: 46, justifyContent: "center", paddingHorizontal: 14 },
  programMenuText: { color: "#202A35", fontSize: 14, fontWeight: "800" },
  hero: { backgroundColor: "rgba(255,255,255,0.74)", borderRadius: 28, gap: 10, padding: 18, shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
  splash: { alignSelf: "center", height: 210, width: 210 },
  title: { color: "#202A35", fontSize: 21, fontWeight: "900", lineHeight: 26 },
  cardTitle: { color: "#202A35", fontSize: 16, fontWeight: "900" },
  sectionTitle: { color: "#202A35", fontSize: 20, fontWeight: "900", marginTop: 4 },
  muted: { color: "#536A86", fontSize: 14, lineHeight: 20 },
  card: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(214,225,235,0.88)", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16, shadowColor: "#0F172A", shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  check: { color: "#111827", fontSize: 16, fontWeight: "900" },
  valueStage: { flex: 1, gap: 22, justifyContent: "center" },
  valueCopy: { gap: 8 },
  propArt: { alignItems: "center", borderRadius: 28, flex: 0.58, justifyContent: "center", minHeight: 230 },
  propIcon: { fontSize: 62, fontWeight: "900" },
  button: { alignItems: "stretch", borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 48, overflow: "hidden" },
  buttonGradient: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 14 },
  secondaryButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14 },
  buttonText: { fontWeight: "900" },
  apiNotice: { backgroundColor: "rgba(255,255,255,0.82)", borderColor: "#D8E4EE", borderRadius: 14, borderWidth: 1, color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17, padding: 10 },
  checkbox: { color: "#111827", flex: 1, fontWeight: "700", lineHeight: 20 },
  fieldLabel: { color: "#253243", fontSize: 12, fontWeight: "900" },
  input: { alignSelf: "stretch", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 16, borderWidth: 1, color: "#111827", minHeight: 50, minWidth: 0, paddingHorizontal: 14, width: "100%" },
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
  freshSigninTop: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 430 },
  freshSigninLogo: { borderRadius: 28, height: 150, width: 150 },
  freshSigninBrand: { color: "#202A35", fontSize: 31, fontWeight: "900", marginTop: 18 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 8 },
  brandIcon: { borderRadius: 12, height: 34, width: 34 },
  brandTitle: { color: "#202A35", flex: 1, fontSize: 20, fontWeight: "900" },
  headerIconButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 14, height: 39, justifyContent: "center", width: 39 },
  headerIconButtonText: { color: "#0F5560", fontSize: 13, fontWeight: "900" },
  signinCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.74)", borderColor: "rgba(210,230,235,0.95)", borderRadius: 22, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 24 },
  signinKicker: { color: "#536A86", fontSize: 12, fontWeight: "600" },
  signinName: { color: "#202A35", fontSize: 25, fontWeight: "900", lineHeight: 30 },
  signinCopy: { color: "#536A86", flexBasis: "100%", fontSize: 14, fontWeight: "600", lineHeight: 22 },
  registerLink: { alignItems: "center", justifyContent: "center", minHeight: 28 },
  registerLinkText: { color: "#0F5560", fontSize: 14, fontWeight: "900", textDecorationLine: "underline" },
  consentCard: { alignItems: "flex-start", backgroundColor: "rgba(255,255,255,0.88)", borderColor: "#D8E4EE", borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 18 },
  consentCheck: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#8A99A8", borderRadius: 3, borderWidth: 1, height: 13, justifyContent: "center", marginTop: 2, width: 13 },
  consentCheckText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", lineHeight: 12 },
  consentText: { color: "#536A86", flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  secureShell: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 43, paddingLeft: 14, paddingRight: 8 },
  secureInput: { color: "#111827", flex: 1, fontSize: 14, fontWeight: "700", minHeight: 43 },
  eyeButton: { alignItems: "center", borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  eyeButtonText: { fontSize: 15, fontWeight: "900" },
  biometricCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#D8E4EE", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 },
  biometricTitle: { color: "#253243", fontSize: 16, fontWeight: "900" },
  biometricCopy: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  smallCheck: { alignItems: "center", borderColor: "#8A99A8", borderRadius: 3, borderWidth: 1, height: 13, justifyContent: "center", width: 13 },
  smallCheckText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", lineHeight: 12 },
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
  dropdownField: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", minHeight: 50, paddingHorizontal: 14 },
  dropdownText: { color: "#111827", flex: 1, fontSize: 14, fontWeight: "600" },
  dropdownCaret: { color: "#111827", fontSize: 18, fontWeight: "900" },
  dropdownList: { backgroundColor: "#FFFFFF", borderColor: "#DDE7EF", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  dropdownOption: { borderBottomColor: "#EEF3F7", borderBottomWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 14 },
  dropdownOptionSelected: { backgroundColor: "#F2FAFC" },
  dropdownOptionText: { color: "#111827", fontSize: 14, fontWeight: "700" },
  trackCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 98,
    padding: 18,
    shadowColor: "#3D8790",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24
  },
  trackTitle: { color: "#202A35", fontSize: 16, fontWeight: "900", lineHeight: 21 },
  trackCopy: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 21, marginTop: 2 },
  trackButton: { borderRadius: 18, minHeight: 48, overflow: "hidden" },
  trackButtonGradient: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 19 },
  trackButtonText: { fontSize: 14, fontWeight: "900" },
  smartPickCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", borderColor: "#DDE7EF", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 86, padding: 16 },
  carousel: { gap: 12, paddingBottom: 8 },
  recCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    minHeight: 116,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 264
  },
  recBody: { flex: 1, gap: 4 },
  recBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  recBadgeText: { fontSize: 10, fontWeight: "900" },
  recTitle: { color: "#202A35", fontSize: 15, fontWeight: "900", lineHeight: 19 },
  recMeta: { color: "#536A86", fontSize: 14, fontWeight: "600", lineHeight: 18 },
  thumb: { alignItems: "center", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  thumbText: { fontSize: 16, fontWeight: "900" },
  emptyInlineCard: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, padding: 16 },
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
  milesSummaryCard: { backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 22, borderWidth: 1, gap: 6, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 18 },
  milesSummaryTitle: { color: "#202A35", fontSize: 17, fontWeight: "900", lineHeight: 22 },
  milesSummaryCopy: { color: "#536A86", fontSize: 13, fontWeight: "700", lineHeight: 19 },
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
  mileCard: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#E4DDED", borderRadius: 20, borderWidth: 1, flex: 1, gap: 10, marginBottom: 24, minHeight: 112, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.10, shadowRadius: 18 },
  mileCardActive: { minHeight: 142, shadowOpacity: 0.16 },
  mileCardLocked: { backgroundColor: "rgba(221,211,233,0.72)", borderColor: "rgba(221,211,233,0.72)", shadowOpacity: 0.02 },
  mileChip: { alignSelf: "center", borderRadius: 8, marginTop: -28, paddingHorizontal: 13, paddingVertical: 5 },
  mileChipText: { fontSize: 12, fontWeight: "900" },
  mileCardTitle: { color: "#202A35", fontSize: 18, fontWeight: "900", lineHeight: 23, textAlign: "center" },
  mileCardTitleLocked: { color: "#6F687C" },
  mileProgressTrack: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 4, overflow: "hidden", width: "78%" },
  mileProgressFill: { borderRadius: 999, height: 4 },
  mileProgressText: { color: "#3F4754", fontSize: 12, fontWeight: "800" },
  mileActivityText: { color: "#536A86", fontSize: 12, fontWeight: "700", lineHeight: 17, textAlign: "center" },
  mileCta: { alignItems: "center", borderColor: "transparent", borderRadius: 999, borderWidth: 1.5, justifyContent: "center", minHeight: 44, paddingHorizontal: 18, width: "100%" },
  mileCtaOutline: { backgroundColor: "#FFFFFF" },
  mileCtaLocked: { backgroundColor: "rgba(198,188,211,0.72)", borderColor: "transparent" },
  mileCtaText: { fontSize: 14, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#DDE7EF", borderRadius: 18, borderWidth: 1, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 16, width: "47%" },
  metricValue: { color: "#111827", fontSize: 24, fontWeight: "900" },
  reminderCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#D8E0E8",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18
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
  reminderSummaryCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#DDE7EF",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  reminderSummaryTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
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
  reminderActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13
  },
  reminderActionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE7EF",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 47
  },
  reminderActionText: {
    fontSize: 14,
    fontWeight: "900"
  },
  viewAllCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#DDE7EF",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 49,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "900"
  },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.58)", flex: 1, justifyContent: "center", padding: 20 },
  programModalCard: { backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#DDE7EF", borderRadius: 24, borderWidth: 1, gap: 14, minHeight: 300, padding: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 28, width: "100%" },
  programModalTitle: { color: "#202A35", fontSize: 21, fontWeight: "900", lineHeight: 27, textAlign: "center" },
  programModalCopy: { color: "#536A86", fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  programPreparing: { alignItems: "center", flex: 1, gap: 18, justifyContent: "center", minHeight: 260 },
  modalBottomCta: { flex: 1, justifyContent: "flex-end", minHeight: 120 },
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
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "#D8E8EF",
    borderRadius: 20,
    borderWidth: 1,
    gap: 18,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22
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
  topicTray: { alignItems: "center", backgroundColor: "#FFFFFF", borderTopLeftRadius: 34, borderTopRightRadius: 34, bottom: 0, gap: 18, left: 0, minHeight: 386, padding: 24, paddingBottom: 34, position: "absolute", right: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: -14 }, shadowOpacity: 0.16, shadowRadius: 24 },
  trayHandle: { backgroundColor: "#6B6178", borderRadius: 999, height: 5, marginBottom: 18, width: 42 },
  trophyCircle: { alignItems: "center", backgroundColor: "#F8DDFC", borderRadius: 999, height: 168, justifyContent: "center", width: 168 },
  trophyIcon: { fontSize: 72 },
  topicCompleteTitle: { color: "#111827", fontSize: 27, fontWeight: "900", lineHeight: 34, textAlign: "center" },
  topicCompleteCopy: { color: "#3F4754", fontSize: 16, fontWeight: "600", lineHeight: 24, textAlign: "center" },
  topicActionRow: { alignSelf: "stretch", gap: 12, marginTop: 14 },
  player: { alignItems: "center", borderRadius: 28, height: 210, justifyContent: "center" },
  playerIcon: { fontSize: 58, fontWeight: "900" },
  flashcard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 28, justifyContent: "center", minHeight: 230, padding: 24 },
  flashText: { color: "#111827", fontSize: 20, fontWeight: "900", lineHeight: 28, textAlign: "center" },
  nav: { alignItems: "center", backgroundColor: "#242424", borderRadius: 34, bottom: 20, flexDirection: "row", justifyContent: "space-between", left: 16, minHeight: 66, paddingHorizontal: 22, paddingVertical: 10, position: "absolute", right: 16, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  navItem: { alignItems: "center", gap: 3, minWidth: 48 },
  navIcon: { fontSize: 24, fontWeight: "900", height: 25, lineHeight: 25, textAlign: "center", width: 25 },
  navText: { fontSize: 10, fontWeight: "900", lineHeight: 13 }
});
