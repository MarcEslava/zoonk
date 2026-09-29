import { sendDueReminders } from "@zoonk/core/reminders/internal/send-due-reminders";
import { getExtracted } from "next-intl/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as runReminders } from "./route";

// The core integration tests own who is reminded and when; this adapter test
// covers only how the scheduler is authenticated and how copy is localized.
vi.mock("@zoonk/core/reminders/internal/send-due-reminders", () => ({ sendDueReminders: vi.fn() }));

vi.mock("next-intl/server", () => ({ getExtracted: vi.fn() }));

const SECRET = "test-cron-secret";

function request(authorization?: string) {
  return new NextRequest("http://localhost/internal/reminders", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /internal/reminders", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    vi.stubEnv("VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_SUBJECT", "mailto:test@zoonk.test");

    vi.mocked(sendDueReminders).mockResolvedValue({ expiredSubscriptions: 0, reminded: 2 });

    vi.mocked(getExtracted).mockResolvedValue(
      ((message: string) => message) as unknown as Awaited<ReturnType<typeof getExtracted>>,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("refuses a caller without the scheduler's secret", async () => {
    const response = await runReminders(request("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(sendDueReminders).not.toHaveBeenCalled();
  });

  it("refuses a caller with no authorization at all", async () => {
    const response = await runReminders(request());

    expect(response.status).toBe(401);
  });

  it("does nothing when push keys are not configured", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    const response = await runReminders(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(sendDueReminders).not.toHaveBeenCalled();
  });

  it("runs the sender for the scheduler and reports what happened", async () => {
    const response = await runReminders(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ expiredSubscriptions: 0, reminded: 2 });
  });

  it("writes each reminder in its course's language, falling back to the default", async () => {
    await runReminders(request(`Bearer ${SECRET}`));

    const senderInput = vi.mocked(sendDueReminders).mock.calls[0]?.[0];

    if (!senderInput) {
      throw new Error("the sender was not called");
    }

    await senderInput.composeMessage({ language: "es" });
    await senderInput.composeMessage({ language: "xx" });

    expect(vi.mocked(getExtracted).mock.calls.map(([options]) => options)).toStrictEqual([
      { locale: "es" },
      { locale: "en" },
    ]);
  });
});
