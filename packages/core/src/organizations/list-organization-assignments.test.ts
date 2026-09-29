import { prisma } from "@zoonk/db";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { createAssignment } from "./create-assignment";
import { listAssignableCourses } from "./list-assignable-courses";
import { listOrganizationAssignments } from "./list-organization-assignments";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** An organization with an owner, a tagged teammate and one published and one draft course. */
async function organizationFixtureWithCourses() {
  const [owner, teammate, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, teammateMember, published, draft] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    organizationMemberFixture({ organizationId: organization.id, userId: teammate.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
    courseFixture({ isPublished: false, organizationId: organization.id }),
  ]);

  const tag = await prisma.memberTag.create({
    data: { name: "funcio:msl", organizationId: organization.id },
  });

  await prisma.memberTagLink.create({ data: { memberId: teammateMember.id, tagId: tag.id } });

  return { draft, organization, owner, published, tag, teammate };
}

describe(listAssignableCourses, () => {
  beforeEach(() => mockSession(null));

  it("offers only the organization's published courses", async () => {
    const { draft, organization, owner, published } = await organizationFixtureWithCourses();

    mockSession(owner.id);

    const result = await listAssignableCourses({ organizationId: organization.id });
    const ids = result.status === "ready" ? result.courses.map((course) => course.id) : [];

    expect(ids).toContain(published.id);
    expect(ids).not.toContain(draft.id);
  });

  it("refuses someone who cannot assign", async () => {
    const { organization, teammate } = await organizationFixtureWithCourses();

    mockSession(teammate.id);

    await expect(listAssignableCourses({ organizationId: organization.id })).resolves.toStrictEqual(
      { status: "forbidden" },
    );
  });
});

describe(listOrganizationAssignments, () => {
  beforeEach(() => mockSession(null));

  it("shows each assignment with its targets and how many people it reaches", async () => {
    const { organization, owner, published, tag } = await organizationFixtureWithCourses();

    mockSession(owner.id);

    await createAssignment({
      courseId: published.id,
      minDailySeconds: 180,
      organizationId: organization.id,
      targets: { tagIds: [tag.id] },
    });

    const result = await listOrganizationAssignments({ organizationId: organization.id });
    const assignments = result.status === "ready" ? result.assignments : [];

    expect(assignments).toHaveLength(1);

    expect(assignments[0]).toMatchObject({
      course: { id: published.id },
      minDailySeconds: 180,
      openRecipientCount: 1,
      targetTags: [tag.name],
    });
  });

  it("refuses someone who cannot read assignments", async () => {
    const { organization, teammate } = await organizationFixtureWithCourses();

    mockSession(teammate.id);

    await expect(
      listOrganizationAssignments({ organizationId: organization.id }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });
});
