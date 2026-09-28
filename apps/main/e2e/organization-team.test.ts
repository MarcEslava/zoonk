import { prisma } from "@zoonk/db";
import { getBaseURL } from "@zoonk/e2e/fixtures/base-url";
import { createOrganization } from "@zoonk/e2e/fixtures/orgs";
import { createE2EUser } from "@zoonk/e2e/fixtures/users";
import { expect, test } from "./fixtures";

/**
 * One organization with an owner who manages the team, a teammate to move
 * between segments, and a course already required from that segment.
 */
async function teamFixture() {
  const organization = await createOrganization({ kind: "school" });

  const [owner, teammate] = await Promise.all([
    createE2EUser(getBaseURL(), { orgRole: "owner", orgSlug: organization.slug }),
    createE2EUser(getBaseURL(), { orgRole: "member", orgSlug: organization.slug }),
  ]);

  const [tag, teammateMember] = await Promise.all([
    prisma.memberTag.create({ data: { name: "zona:levante", organizationId: organization.id } }),
    prisma.member.findFirstOrThrow({
      where: { organizationId: organization.id, userId: teammate.id },
    }),
  ]);

  const teammateName = await prisma.user
    .findUniqueOrThrow({ where: { id: teammate.id } })
    .then((user) => user.name);

  return { organization, owner, tag, teammateMember, teammateName };
}

test.describe("Organization Team", () => {
  test("an owner grants a segment and the change is saved", async ({ browser }) => {
    const { organization, owner, tag, teammateMember, teammateName } = await teamFixture();

    const context = await browser.newContext({ storageState: owner.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}`);

    const form = page.getByRole("form", { name: `Segments for ${teammateName}` });
    const segment = form.getByRole("checkbox", { name: tag.name });

    await expect(segment).not.toBeChecked();

    await segment.check();
    await form.getByRole("button", { name: /save segments/iu }).click();

    await expect(form.getByText(/segments saved/iu)).toBeVisible();

    const links = await prisma.memberTagLink.findMany({ where: { memberId: teammateMember.id } });

    expect(links.map((link) => link.tagId)).toStrictEqual([tag.id]);

    await context.close();
  });

  test("a plain member cannot open the team page", async ({ browser }) => {
    const organization = await createOrganization({ kind: "school" });

    const plainMember = await createE2EUser(getBaseURL(), {
      orgRole: "member",
      orgSlug: organization.slug,
    });

    const context = await browser.newContext({ storageState: plainMember.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}`);

    await expect(page.getByRole("form")).toHaveCount(0);

    await context.close();
  });

  test("an owner creates the first segment and can grant it right away", async ({ browser }) => {
    const organization = await createOrganization({ kind: "school" });

    const owner = await createE2EUser(getBaseURL(), {
      orgRole: "owner",
      orgSlug: organization.slug,
    });

    const context = await browser.newContext({ storageState: owner.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}`);

    await expect(page.getByText(/no segments yet/iu)).toBeVisible();

    await page.getByLabel(/new segment/iu).fill("  Zona : Levante ");
    await page.getByRole("button", { name: /add segment/iu }).click();

    await expect(page.getByRole("checkbox", { name: "zona:levante" })).toBeVisible();

    const tags = await prisma.memberTag.findMany({ where: { organizationId: organization.id } });

    expect(tags.map((tag) => tag.name)).toStrictEqual(["zona:levante"]);

    await context.close();
  });
});
