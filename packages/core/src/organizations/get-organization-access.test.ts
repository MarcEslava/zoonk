import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { getOrganizationAccess } from "./get-organization-access";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** Places one fixture user in an organization and asks for a permission as them. */
async function accessAs({
  permissions,
  role,
}: {
  permissions: Parameters<typeof getOrganizationAccess>[0]["permissions"];
  role: string;
}) {
  const [user, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  await organizationMemberFixture({ organizationId: organization.id, role, userId: user.id });
  mockSession(user.id);

  return getOrganizationAccess({ organizationId: organization.id, permissions });
}

describe(getOrganizationAccess, () => {
  beforeEach(() => mockSession(null));

  it("rejects an unauthenticated caller", async () => {
    const organization = await organizationFixture({ kind: "school" });

    await expect(
      getOrganizationAccess({ organizationId: organization.id, permissions: { course: ["read"] } }),
    ).resolves.toStrictEqual({ status: "unauthorized" });
  });

  it("hides the organization from someone who does not belong to it", async () => {
    const [user, organization] = await Promise.all([
      userFixture(),
      organizationFixture({ kind: "school" }),
    ]);

    mockSession(user.id);

    await expect(
      getOrganizationAccess({ organizationId: organization.id, permissions: { course: ["read"] } }),
    ).resolves.toStrictEqual({ status: "notFound" });
  });

  it("lets a member read courses", async () => {
    const access = await accessAs({ permissions: { course: ["read"] }, role: "member" });

    expect(access.status).toBe("ready");
  });

  it("stops a member from updating courses", async () => {
    const access = await accessAs({ permissions: { course: ["update"] }, role: "member" });

    expect(access.status).toBe("forbidden");
  });

  it("lets an admin update courses", async () => {
    const access = await accessAs({ permissions: { course: ["update"] }, role: "admin" });

    expect(access.status).toBe("ready");
  });

  it("stops an admin from deleting courses", async () => {
    const access = await accessAs({ permissions: { course: ["delete"] }, role: "admin" });

    expect(access.status).toBe("forbidden");
  });

  it("lets an owner delete courses", async () => {
    const access = await accessAs({ permissions: { course: ["delete"] }, role: "owner" });

    expect(access.status).toBe("ready");
  });

  it("fails closed for a role the product does not define", async () => {
    const access = await accessAs({ permissions: { course: ["read"] }, role: "supervisor" });

    expect(access.status).toBe("forbidden");
  });
});
