import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../../_test-utils/mock-session";
import { createAssignment } from "../create-assignment";
import { reconcileAssignmentRecipients } from "./reconcile-recipients";

vi.mock("../../users/get-session", () => ({ getSession: vi.fn() }));

/** One organization with an owner, a course of its own and a segment tag. */
async function assignmentFixture() {
  const [owner, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [ownerMember, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const tag = await prisma.memberTag.create({
    data: { name: "zona:levante", organizationId: organization.id },
  });

  mockSession(owner.id);

  const created = await createAssignment({
    courseId: course.id,
    organizationId: organization.id,
    targets: { memberIds: [ownerMember.id], tagIds: [tag.id] },
  });

  if (created.status !== "created") {
    throw new Error(`assignment not created: ${created.status}`);
  }

  return { assignment: created.assignment, organization, owner, ownerMember, tag };
}

async function addMember(organizationId: string) {
  const user = await userFixture();
  const member = await organizationMemberFixture({ organizationId, userId: user.id });
  return member;
}

/** Loads an assignment with its targets and reconciles it the way the capabilities do. */
async function reconcile(assignmentId: string) {
  const assignment = await prisma.assignment.findUniqueOrThrow({
    include: { targets: true },
    where: { id: assignmentId },
  });

  return reconcileAssignmentRecipients({ assignment });
}

function openPeriods(assignmentId: string) {
  return prisma.assignmentRecipient.findMany({ where: { assignmentId, removedAt: null } });
}

describe(reconcileAssignmentRecipients, () => {
  beforeEach(() => mockSession(null));

  it("applies a standing assignment to someone who joins the segment later", async () => {
    const { assignment, organization, owner, tag } = await assignmentFixture();
    const joiner = await addMember(organization.id);

    await prisma.memberTagLink.create({ data: { memberId: joiner.id, tagId: tag.id } });
    mockSession(owner.id);

    await expect(reconcile(assignment.id)).resolves.toStrictEqual({ closed: 0, opened: 1 });

    const rows = await openPeriods(assignment.id);

    expect(rows.find((row) => row.memberId === joiner.id)?.matchedTagId).toBe(tag.id);
  });

  it("closes the period for someone who leaves the segment", async () => {
    const { assignment, organization, owner, tag } = await assignmentFixture();
    const joiner = await addMember(organization.id);

    const link = await prisma.memberTagLink.create({
      data: { memberId: joiner.id, tagId: tag.id },
    });

    mockSession(owner.id);
    await reconcile(assignment.id);

    await prisma.memberTagLink.delete({ where: { id: link.id } });

    await expect(reconcile(assignment.id)).resolves.toStrictEqual({ closed: 1, opened: 0 });

    const closed = await prisma.assignmentRecipient.findFirst({
      where: { assignmentId: assignment.id, memberId: joiner.id },
    });

    expect(closed?.removedAt).toBeInstanceOf(Date);
  });

  it("opens a second period when someone returns to the segment", async () => {
    const { assignment, organization, owner, tag } = await assignmentFixture();
    const joiner = await addMember(organization.id);

    const link = await prisma.memberTagLink.create({
      data: { memberId: joiner.id, tagId: tag.id },
    });

    mockSession(owner.id);
    await reconcile(assignment.id);

    await prisma.memberTagLink.delete({ where: { id: link.id } });
    await reconcile(assignment.id);

    await prisma.memberTagLink.create({ data: { memberId: joiner.id, tagId: tag.id } });

    await expect(reconcile(assignment.id)).resolves.toStrictEqual({ closed: 0, opened: 1 });

    const periods = await prisma.assignmentRecipient.findMany({
      where: { assignmentId: assignment.id, memberId: joiner.id },
    });

    expect(periods).toHaveLength(2);
    expect(periods.filter((period) => period.removedAt === null)).toHaveLength(1);
  });

  it("keeps a directly named person while a segment change happens around them", async () => {
    const { assignment, owner, ownerMember } = await assignmentFixture();

    mockSession(owner.id);
    await reconcile(assignment.id);

    const rows = await openPeriods(assignment.id);

    expect(rows.some((row) => row.memberId === ownerMember.id)).toBe(true);
  });

  it("closes the period and keeps the record when someone leaves the organization", async () => {
    const { assignment, organization, owner, tag } = await assignmentFixture();
    const joiner = await addMember(organization.id);

    await prisma.memberTagLink.create({ data: { memberId: joiner.id, tagId: tag.id } });
    mockSession(owner.id);
    await reconcile(assignment.id);

    await prisma.member.delete({ where: { id: joiner.id } });

    await expect(reconcile(assignment.id)).resolves.toStrictEqual({ closed: 1, opened: 0 });

    const orphan = await prisma.assignmentRecipient.findFirst({
      where: { assignmentId: assignment.id, userId: joiner.userId },
    });

    expect(orphan?.memberId).toBeNull();
    expect(orphan?.removedAt).toBeInstanceOf(Date);
  });

  it("does nothing when nothing changed", async () => {
    const { assignment, owner } = await assignmentFixture();

    mockSession(owner.id);
    await reconcile(assignment.id);

    await expect(reconcile(assignment.id)).resolves.toStrictEqual({ closed: 0, opened: 0 });
  });
});
