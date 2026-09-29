import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { reconcileAssignmentRecipients } from "./_utils/reconcile-recipients";
import { createAssignment } from "./create-assignment";
import { listCurrentUserAssignments } from "./list-current-user-assignments";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** An organization that has already required one course from a named learner. */
async function requiredCourseFixture() {
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

  mockSession(owner.id);

  const created = await createAssignment({
    courseId: course.id,
    dueAt: new Date("2027-01-31"),
    minDailySeconds: 180,
    organizationId: organization.id,
    targets: { memberIds: [learnerMember.id] },
  });

  if (created.status !== "created") {
    throw new Error(`assignment not created: ${created.status}`);
  }

  return { assignment: created.assignment, course, learner, learnerMember, organization, owner };
}

describe(listCurrentUserAssignments, () => {
  beforeEach(() => mockSession(null));

  it("returns nothing for a guest", async () => {
    await expect(listCurrentUserAssignments()).resolves.toStrictEqual([]);
  });

  it("returns the course an organization requires, with its deadline and daily target", async () => {
    const { assignment, course, learner } = await requiredCourseFixture();

    mockSession(learner.id);

    const assignments = await listCurrentUserAssignments();

    expect(assignments).toHaveLength(1);

    expect(assignments[0]).toMatchObject({
      course: { id: course.id },
      dueAt: new Date("2027-01-31"),
      id: assignment.id,
      minDailySeconds: 180,
    });
  });

  it("does not show one learner's obligation to another", async () => {
    await requiredCourseFixture();

    const stranger = await userFixture();

    mockSession(stranger.id);

    await expect(listCurrentUserAssignments()).resolves.toStrictEqual([]);
  });

  it("drops the obligation once its period is closed", async () => {
    const { assignment, learner, learnerMember } = await requiredCourseFixture();

    await prisma.member.delete({ where: { id: learnerMember.id } });

    await reconcileAssignmentRecipients({
      assignment: await prisma.assignment.findUniqueOrThrow({
        include: { targets: true },
        where: { id: assignment.id },
      }),
    });

    mockSession(learner.id);

    await expect(listCurrentUserAssignments()).resolves.toStrictEqual([]);
  });

  it("hides an obligation whose membership is already gone but not yet reconciled", async () => {
    const { learner, learnerMember } = await requiredCourseFixture();

    await prisma.member.delete({ where: { id: learnerMember.id } });
    mockSession(learner.id);

    await expect(listCurrentUserAssignments()).resolves.toStrictEqual([]);
  });
});
