import "dotenv/config";

const baseUrl = process.env.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
const adminToken = process.env.ADMIN_API_TOKEN ?? "";
const runId = Date.now().toString().slice(-9);
const testPhone = `+919${runId}`;
const testPassword = `Smoke@${runId}`;

type ApiResponse<T> = { data: T };

async function main() {
  const results: string[] = [];
  await step("health", async () => {
    const body = await request<{ ok: boolean }>("/health");
    assert(body.ok === true, "Health endpoint did not return ok=true");
  }, results);

  await step("bootstrap", async () => {
    const body = await request<{ persona: { role: string } }>("/api/v1/bootstrap?role=student");
    assert(body.persona.role === "student", "Bootstrap did not return student persona");
  }, results);

  await step("register start", async () => {
    const body = await request<ApiResponse<{ otpSent: boolean }>>("/api/v1/auth/register/start", {
      method: "POST",
      body: { phone: testPhone, role: "student" }
    });
    assert(body.data.otpSent === true, "OTP start did not succeed");
  }, results);

  const session = await step("register verify", async () => {
    const body = await request<ApiResponse<{ accessToken: string; refreshToken: string; userId: string; profileId: string }>>("/api/v1/auth/register/verify", {
      method: "POST",
      body: {
        phone: testPhone,
        role: "student",
        otp: "123456",
        password: testPassword,
        profile: {
          firstName: "Smoke",
          lastName: "Student",
          dob: "24/06/2010",
          city: "Bengaluru",
          stream: "senior",
          specialization: "CBSE Class 10 Mathematics"
        }
      }
    });
    assert(Boolean(body.data.accessToken), "Registration did not return access token");
    return body.data;
  }, results);

  await step("identity", async () => {
    const body = await request<ApiResponse<{ user: { phone: string }; activeProfile: { role: string } | null }>>("/api/v1/identity/me?role=student", {
      accessToken: session.accessToken
    });
    assert(body.data.user.phone === testPhone, "Identity phone mismatch");
    assert(body.data.activeProfile?.role === "student", "Identity active profile mismatch");
  }, results);

  await step("program catalog", async () => {
    const body = await request<ApiResponse<Array<{ id: string; title: string }>>>("/api/v1/education-plan/programs?role=student", {
      accessToken: session.accessToken
    });
    assert(Array.isArray(body.data), "Programs response is not an array");
  }, results);

  await step("notifications", async () => {
    const body = await request<ApiResponse<Array<{ id: string }>>>("/api/v1/notifications?role=student", {
      accessToken: session.accessToken
    });
    assert(Array.isArray(body.data), "Notifications response is not an array");
  }, results);

  await step("refresh", async () => {
    const body = await request<ApiResponse<{ accessToken: string }>>("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: session.refreshToken }
    });
    assert(Boolean(body.data.accessToken), "Refresh did not return a new access token");
  }, results);

  if (adminToken) {
    await step("admin cleanup", async () => {
      const body = await request<ApiResponse<{ mode: string; status?: string }>>(`/api/v1/admin/users/by-phone?phone=${encodeURIComponent(testPhone)}&mode=soft`, {
        method: "DELETE",
        adminToken
      });
      assert(body.data.mode === "soft", "Admin cleanup did not soft-delete user");
    }, results);
  }

  console.log(results.join("\n"));
}

async function step<T>(name: string, fn: () => Promise<T>, results: string[]) {
  try {
    const value = await fn();
    results.push(`PASS ${name}`);
    return value;
  } catch (error) {
    results.push(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(results.join("\n"));
    process.exitCode = 1;
    throw error;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; accessToken?: string; adminToken?: string } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.adminToken ? { "x-admin-token": options.adminToken, "x-admin-actor": "api-smoke-test" } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return body as T;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

main().catch(() => {
  process.exitCode = 1;
});
