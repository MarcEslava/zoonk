import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { createAssignment } from "./create-assignment";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** One organization with an owner who can assign and a course of its own. */
async function organizationFixtureWithOwner() {
  const [owner, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [ownerMember, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  mockSession(owner.id);

  return { course, organization, owner, ownerMember };
}

async function addTaggedMember({
  organizationId,
  tagId,
}: {
  organizationId: string;
  tagId: string;
}) {
  const user = await userFixture();
  const member = await organizationMemberFixture({ organizationId, userId: user.id });

  await prisma.memberTagLink.create({ data: { memberId: member.id, tagId } });

  return member;
}

describe(createAssignment, () => {
  beforeEach(() => mockSession(null));

  it("refuses a caller who cannot assign", async () => {
    const { course, organization } = await organizationFixtureWithOwner();
    const outsider = await userFixture();

    const member = await organizationMemberFixture({
      organizationId: organization.id,
      role: "member",
      userId: outsider.id,
    });

    mockSession(outsider.id);

    await expect(
      createAssignment({
        courseId: course.id,
        organizationId: organization.id,
        targets: { memberIds: [member.id] },
      }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("refuses another organization's private course", async () => {
    const { organization, ownerMember } = await organizationFixtureWithOwner();
    const otherOrg = await organizationFixture({ kind: "school" });
    const otherCourse = await courseFixture({ isPublished: true, organizationId: otherOrg.id });

    await expect(
      createAssignment({
        courseId: otherCourse.id,
        organizationId: organization.id,
        targets: { memberIds: [ownerMember.id] },
      }),
    ).resolves.toStrictEqual({ status: "courseNotAvailable" });
  });

  it("accepts a public brand course", async () => {
    const { organization, ownerMember } = await organizationFixtureWithOwner();
    const brandOrg = await organizationFixture({ kind: "brand" });
    const brandCourse = await courseFixture({ isPublished: true, organizationId: brandOrg.id });

    const result = await createAssignment({
      courseId: brandCourse.id,
      organizationId: organization.id,
      targets: { memberIds: [ownerMember.id] },
    });

    expect(result.status).toBe("created");
  });

  it("expands a tag into its members and records why each was included", async () => {
    const { course, organization, ownerMember } = await organizationFixtureWithOwner();

    const tag = await prisma.memberTag.create({
      data: { name: "zona:levante", organizationId: organization.id },
    });

    const tagged = await addTaggedMember({ organizationId: organization.id, tagId: tag.id });

    const result = await createAssignment({
      courseId: course.id,
      organizationId: organization.id,
      targets: { memberIds: [ownerMember.id], tagIds: [tag.id] },
    });

    expect(result).toMatchObject({ recipientCount: 2, status: "created" });

    const recipients = await prisma.assignmentRecipient.findMany({
      where: { assignmentId: result.status === "created" ? result.assignment.id : "" },
    });

    expect(recipients).toHaveLength(2);
    expect(recipients.find((row) => row.memberId === tagged.id)?.matchedTagId).toBe(tag.id);
    expect(recipients.find((row) => row.memberId === ownerMember.id)?.matchedTagId).toBeNull();
  });

  it("keeps one recipient row when a person is both named and tagged", async () => {
    const { course, organization } = await organizationFixtureWithOwner();

    const tag = await prisma.memberTag.create({
      data: { name: "funcio:msl", organizationId: organization.id },
    });

    const tagged = await addTaggedMember({ organizationId: organization.id, tagId: tag.id });

    const result = await createAssignment({
      courseId: course.id,
      organizationId: organization.id,
      targets: { memberIds: [tagged.id], tagIds: [tag.id] },
    });

    expect(result).toMatchObject({ recipientCount: 1, status: "created" });
  });

  it("creates a standing assignment even when the tag has no members yet", async () => {
    const { course, organization } = await organizationFixtureWithOwner();

    const tag = await prisma.memberTag.create({
      data: { name: "zona:norte", organizationId: organization.id },
    });

    const result = await createAssignment({
      courseId: course.id,
      organizationId: organization.id,
      targets: { tagIds: [tag.id] },
    });

    expect(result).toMatchObject({ recipientCount: 0, status: "created" });
  });

  it("refuses a tag that belongs to another organization", async () => {
    const { course, organization } = await organizationFixtureWithOwner();
    const otherOrg = await organizationFixture({ kind: "school" });

    const foreignTag = await prisma.memberTag.create({
      data: { name: "zona:sur", organizationId: otherOrg.id },
    });

    await expect(
      createAssignment({
        courseId: course.id,
        organizationId: organization.id,
        targets: { tagIds: [foreignTag.id] },
      }),
    ).resolves.toStrictEqual({ status: "invalidTargets" });
  });

  it("refuses an assignment with no targets", async () => {
    const { course, organization } = await organizationFixtureWithOwner();

    await expect(
      createAssignment({ courseId: course.id, organizationId: organization.id, targets: {} }),
    ).resolves.toStrictEqual({ status: "noTargets" });
  });
});
