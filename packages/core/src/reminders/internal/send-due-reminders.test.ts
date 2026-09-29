import { randomUUID } from "node:crypto";
import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendDueReminders } from "./send-due-reminders";

const { WebPushError, sendNotification } = vi.hoisted(() => {
  class HoistedWebPushError extends Error {
    statusCode: number;

    constructor(statusCode: number) {
      super(`push service answered ${statusCode}`);
      this.statusCode = statusCode;
    }
  }

  return { WebPushError: HoistedWebPushError, sendNotification: vi.fn() };
});

vi.mock("web-push", () => ({ default: { WebPushError, sendNotification } }));

const VAPID = { privateKey: "private", publicKey: "public", subject: "mailto:test@zoonk.test" };

/** Tuesday 10:30 in Madrid, summer time. */
const DUE_NOW = new Date("2026-09-29T08:30:00.000Z");
const DUE_DATE = new Date("2026-09-29T00:00:00.000Z");

const composeMessage = vi.fn(({ language }: { language: string }) =>
  Promise.resolve({ body: `body-${language}`, title: `title-${language}` }),
);

/**
 * A learner an organization reminds at 10:00 Madrid time, asked for three
 * minutes a day in a Spanish course, with reminders on for one browser.
 */
async function remindedLearnerFixture({ withSubscription = true } = {}) {
  const [owner, learner, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, learnerMember, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    organizationMemberFixture({ organizationId: organization.id, userId: learner.id }),
    courseFixture({ isPublished: true, language: "es", organizationId: organization.id }),
  ]);

  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      createdById: owner.id,
      minDailySeconds: 180,
      organizationId: organization.id,
    },
  });

  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;

  await Promise.all([
    prisma.assignmentRecipient.create({
      data: { assignmentId: assignment.id, memberId: learnerMember.id, userId: learner.id },
    }),
    prisma.organizationReminderSchedule.create({
      data: { hour: 10, organizationId: organization.id, timeZone: "Europe/Madrid" },
    }),
    withSubscription &&
      prisma.pushSubscription.create({
        data: { auth: "auth", endpoint, p256dh: "key", userId: learner.id },
      }),
  ]);

  return { endpoint, learner };
}

/** Pushes sent to one browser, so other tests' schedules never skew a count. */
function pushesTo(endpoint: string) {
  return sendNotification.mock.calls.filter(([subscription]) => subscription.endpoint === endpoint);
}

function run(now: Date = DUE_NOW) {
  return sendDueReminders({ composeMessage, now, vapid: VAPID });
}

describe(sendDueReminders, () => {
  beforeEach(() => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    composeMessage.mockClear();
  });

  it("reminds a learner whose goal for today is still ahead, in the course's language", async () => {
    const { endpoint } = await remindedLearnerFixture();

    await run();

    const pushes = pushesTo(endpoint);

    expect(pushes).toHaveLength(1);

    expect(JSON.parse(pushes[0]?.[1] as string)).toStrictEqual({
      body: "body-es",
      title: "title-es",
      url: "/my",
    });
  });

  it("reminds nobody more than once a day however often it runs", async () => {
    const { endpoint } = await remindedLearnerFixture();

    await run();
    await run();

    expect(pushesTo(endpoint)).toHaveLength(1);
  });

  it("leaves alone someone who already met today's goal", async () => {
    const { endpoint, learner } = await remindedLearnerFixture();

    await prisma.dailyProgress.create({
      data: { date: DUE_DATE, dayOfWeek: 2, timeSpentSeconds: 180, userId: learner.id },
    });

    await run();

    expect(pushesTo(endpoint)).toHaveLength(0);
  });

  it("sends nothing outside the organization's chosen hour", async () => {
    const { endpoint } = await remindedLearnerFixture();

    await run(new Date("2026-09-29T09:30:00.000Z"));

    expect(pushesTo(endpoint)).toHaveLength(0);
  });

  it("sends nothing at a weekend", async () => {
    const { endpoint } = await remindedLearnerFixture();

    await run(new Date("2026-10-03T08:30:00.000Z"));

    expect(pushesTo(endpoint)).toHaveLength(0);
  });

  it("does not record a reminder for someone with reminders turned off", async () => {
    const { learner } = await remindedLearnerFixture({ withSubscription: false });

    await run();

    await expect(
      prisma.reminderDelivery.findMany({ where: { userId: learner.id } }),
    ).resolves.toHaveLength(0);
  });

  it("forgets a browser the push service says no longer exists", async () => {
    const { endpoint } = await remindedLearnerFixture();

    sendNotification.mockImplementation((subscription: { endpoint: string }) =>
      subscription.endpoint === endpoint
        ? Promise.reject(new WebPushError(410))
        : Promise.resolve({ statusCode: 201 }),
    );

    await run();

    await expect(prisma.pushSubscription.findUnique({ where: { endpoint } })).resolves.toBeNull();
  });

  it("keeps delivery records only for as long as they are needed", async () => {
    const { learner } = await remindedLearnerFixture();

    await prisma.reminderDelivery.create({
      data: { date: new Date("2026-08-01T00:00:00.000Z"), userId: learner.id },
    });

    await run();

    const deliveries = await prisma.reminderDelivery.findMany({ where: { userId: learner.id } });

    expect(deliveries.map((row) => row.date)).toStrictEqual([DUE_DATE]);
  });
});
