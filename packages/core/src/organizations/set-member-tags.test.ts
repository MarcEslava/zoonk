import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { createAssignment } from "./create-assignment";
import { setMemberTags } from "./set-member-tags";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** An organization with a standing assignment for everyone carrying one tag. */
async function standingAssignmentFixture() {
  const [owner, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const [tag, otherTag] = await Promise.all([
    prisma.memberTag.create({ data: { name: "zona:levante", organizationId: organization.id } }),
    prisma.memberTag.create({ data: { name: "zona:norte", organizationId: organization.id } }),
  ]);

  mockSession(owner.id);

  const created = await createAssignment({
    courseId: course.id,
    organizationId: organization.id,
    targets: { tagIds: [tag.id] },
  });

  if (created.status !== "created") {
    throw new Error(`assignment not created: ${created.status}`);
  }

  const learner = await userFixture();

  const learnerMember = await organizationMemberFixture({
    organizationId: organization.id,
    userId: learner.id,
  });

  return { assignment: created.assignment, learnerMember, organization, otherTag, owner, tag };
}

function openPeriodsFor(memberId: string) {
  return prisma.assignmentRecipient.findMany({ where: { memberId, removedAt: null } });
}

describe(setMemberTags, () => {
  beforeEach(() => mockSession(null));

  it("refuses a caller who cannot manage members", async () => {
    const { learnerMember, organization, tag } = await standingAssignmentFixture();
    const outsider = await userFixture();

    await organizationMemberFixture({
      organizationId: organization.id,
      role: "member",
      userId: outsider.id,
    });

    mockSession(outsider.id);

    await expect(
      setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id] }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("refuses a tag from another organization", async () => {
    const { learnerMember, owner } = await standingAssignmentFixture();
    const otherOrg = await organizationFixture({ kind: "school" });

    const foreignTag = await prisma.memberTag.create({
      data: { name: "zona:sur", organizationId: otherOrg.id },
    });

    mockSession(owner.id);

    await expect(
      setMemberTags({ memberId: learnerMember.id, tagIds: [foreignTag.id] }),
    ).resolves.toStrictEqual({ status: "invalidTags" });
  });

  it("requires the standing course as soon as the segment is granted", async () => {
    const { learnerMember, owner, tag } = await standingAssignmentFixture();

    mockSession(owner.id);

    await expect(
      setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id] }),
    ).resolves.toStrictEqual({ reconciledAssignments: 1, status: "updated" });

    await expect(openPeriodsFor(learnerMember.id)).resolves.toHaveLength(1);
  });

  it("closes the obligation when the segment is taken away", async () => {
    const { learnerMember, otherTag, owner, tag } = await standingAssignmentFixture();

    mockSession(owner.id);
    await setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id] });
    await setMemberTags({ memberId: learnerMember.id, tagIds: [otherTag.id] });

    await expect(openPeriodsFor(learnerMember.id)).resolves.toStrictEqual([]);

    const periods = await prisma.assignmentRecipient.findMany({
      where: { memberId: learnerMember.id },
    });

    expect(periods).toHaveLength(1);
    expect(periods[0]?.removedAt).toBeInstanceOf(Date);
  });

  it("does not touch assignments when the tags did not change", async () => {
    const { learnerMember, owner, tag } = await standingAssignmentFixture();

    mockSession(owner.id);
    await setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id] });

    await expect(
      setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id] }),
    ).resolves.toStrictEqual({ reconciledAssignments: 0, status: "updated" });
  });

  it("replaces the whole set rather than adding to it", async () => {
    const { learnerMember, otherTag, owner, tag } = await standingAssignmentFixture();

    mockSession(owner.id);
    await setMemberTags({ memberId: learnerMember.id, tagIds: [tag.id, otherTag.id] });
    await setMemberTags({ memberId: learnerMember.id, tagIds: [otherTag.id] });

    const links = await prisma.memberTagLink.findMany({ where: { memberId: learnerMember.id } });

    expect(links.map((link) => link.tagId)).toStrictEqual([otherTag.id]);
  });
});
