import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { getCurrentUserHabit } from "./get-current-user-habit";
import { getRequestProgressDateContext } from "./get-request-date-context";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

vi.mock("./get-request-date-context", () => ({ getRequestProgressDateContext: vi.fn() }));

// A Thursday, so Monday to Wednesday of the same week are already behind us.
const TODAY = new Date("2026-10-01T00:00:00.000Z");

/** A learner an organization asks for three minutes a day. */
async function assignedLearnerFixture() {
  const [owner, learner, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, learnerMember, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    organizationMemberFixture({ organizationId: organization.id, userId: learner.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      createdById: owner.id,
      minDailySeconds: 180,
      organizationId: organization.id,
    },
  });

  await prisma.assignmentRecipient.create({
    data: { assignmentId: assignment.id, memberId: learnerMember.id, userId: learner.id },
  });

  return { learner };
}

function studied({ date, seconds, userId }: { date: string; seconds: number; userId: string }) {
  const day = new Date(`${date}T00:00:00.000Z`);

  return prisma.dailyProgress.create({
    data: { date: day, dayOfWeek: day.getUTCDay(), timeSpentSeconds: seconds, userId },
  });
}

describe(getCurrentUserHabit, () => {
  beforeEach(() => {
    mockSession(null);

    vi.mocked(getRequestProgressDateContext).mockResolvedValue({
      currentDate: TODAY,
      currentInstant: TODAY,
      timeZone: "Europe/Madrid",
    });
  });

  it("returns nothing for a guest", async () => {
    await expect(getCurrentUserHabit()).resolves.toBeNull();
  });

  it("returns nothing when no organization asks for daily study", async () => {
    const learner = await userFixture();

    mockSession(learner.id);

    await expect(getCurrentUserHabit()).resolves.toBeNull();
  });

  it("builds the week from the learner's own progress against the assigned goal", async () => {
    const { learner } = await assignedLearnerFixture();

    await Promise.all([
      studied({ date: "2026-09-28", seconds: 200, userId: learner.id }),
      studied({ date: "2026-09-29", seconds: 90, userId: learner.id }),
      studied({ date: "2026-10-01", seconds: 180, userId: learner.id }),
    ]);

    mockSession(learner.id);

    await expect(getCurrentUserHabit()).resolves.toStrictEqual({
      dailyGoalSeconds: 180,
      todaySeconds: 180,
      weekGoalDays: 3,
      weekMetDays: 2,
      weeklyStreak: 0,
    });
  });

  it("ignores everyone else's progress", async () => {
    const [{ learner }, stranger] = await Promise.all([assignedLearnerFixture(), userFixture()]);

    await studied({ date: "2026-10-01", seconds: 600, userId: stranger.id });

    mockSession(learner.id);

    await expect(getCurrentUserHabit()).resolves.toMatchObject({ todaySeconds: 0 });
  });
});
