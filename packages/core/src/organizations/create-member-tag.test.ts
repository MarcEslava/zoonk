import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { createMemberTag } from "./create-member-tag";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** One organization and a signed-in member with the given role. */
async function signedInAs(role: string) {
  const [user, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  await organizationMemberFixture({ organizationId: organization.id, role, userId: user.id });
  mockSession(user.id);

  return { organization };
}

describe(createMemberTag, () => {
  beforeEach(() => mockSession(null));

  it("refuses a plain member", async () => {
    const { organization } = await signedInAs("member");

    await expect(
      createMemberTag({ name: "zona:levante", organizationId: organization.id }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("creates a segment for an admin", async () => {
    const { organization } = await signedInAs("admin");

    const result = await createMemberTag({ name: "zona:levante", organizationId: organization.id });

    expect(result).toMatchObject({ status: "created", tag: { name: "zona:levante" } });
  });

  it("folds case and spacing so near-identical names cannot become twins", async () => {
    const { organization } = await signedInAs("owner");

    const result = await createMemberTag({
      name: "  Zona : Levante ",
      organizationId: organization.id,
    });

    expect(result).toMatchObject({ status: "created", tag: { name: "zona:levante" } });
  });

  it("reports a duplicate instead of creating a second copy", async () => {
    const { organization } = await signedInAs("owner");

    await createMemberTag({ name: "zona:levante", organizationId: organization.id });

    await expect(
      createMemberTag({ name: "ZONA:LEVANTE", organizationId: organization.id }),
    ).resolves.toStrictEqual({ status: "duplicate" });
  });

  it("rejects a name that is only whitespace", async () => {
    const { organization } = await signedInAs("owner");

    await expect(
      createMemberTag({ name: "   ", organizationId: organization.id }),
    ).resolves.toStrictEqual({ status: "invalidName" });
  });
});
