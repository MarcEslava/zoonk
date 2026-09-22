import { prisma } from "@zoonk/db";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { listOrganizationMembers } from "./list-organization-members";
import { listOrganizationTags } from "./list-organization-tags";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

async function teamFixture() {
  const [owner, learner, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, learnerMember] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role: "owner", userId: owner.id }),
    organizationMemberFixture({ organizationId: organization.id, userId: learner.id }),
  ]);

  const tag = await prisma.memberTag.create({
    data: { name: "zona:levante", organizationId: organization.id },
  });

  await prisma.memberTagLink.create({ data: { memberId: learnerMember.id, tagId: tag.id } });

  return { learnerMember, organization, owner, tag };
}

describe(listOrganizationMembers, () => {
  beforeEach(() => mockSession(null));

  it("hides the team from a plain member", async () => {
    const { learnerMember, organization } = await teamFixture();
    const member = await prisma.member.findUniqueOrThrow({ where: { id: learnerMember.id } });

    mockSession(member.userId);

    await expect(listOrganizationMembers({ organizationId: organization.id })).resolves.toBeNull();
  });

  it("lists the team with the segments each person carries", async () => {
    const { learnerMember, organization, owner, tag } = await teamFixture();

    mockSession(owner.id);

    const members = await listOrganizationMembers({ organizationId: organization.id });

    expect(members).toHaveLength(2);

    const learnerRow = members?.find((row) => row.id === learnerMember.id);

    expect(learnerRow?.tags.map((row) => row.name)).toStrictEqual([tag.name]);
  });
});

describe(listOrganizationTags, () => {
  beforeEach(() => mockSession(null));

  it("hides the vocabulary from a plain member", async () => {
    const { learnerMember, organization } = await teamFixture();
    const member = await prisma.member.findUniqueOrThrow({ where: { id: learnerMember.id } });

    mockSession(member.userId);

    await expect(listOrganizationTags({ organizationId: organization.id })).resolves.toBeNull();
  });

  it("lists the organization's own tags", async () => {
    const { organization, owner, tag } = await teamFixture();

    mockSession(owner.id);

    const tags = await listOrganizationTags({ organizationId: organization.id });

    expect(tags?.map((row) => row.name)).toStrictEqual([tag.name]);
  });
});
