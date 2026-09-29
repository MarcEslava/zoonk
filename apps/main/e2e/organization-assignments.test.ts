import { prisma } from "@zoonk/db";
import { getBaseURL } from "@zoonk/e2e/fixtures/base-url";
import { createOrganization } from "@zoonk/e2e/fixtures/orgs";
import { createE2EUser } from "@zoonk/e2e/fixtures/users";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { expect, test } from "./fixtures";

/** One organization with a published course and a teammate already in a segment. */
async function assignableFixture() {
  const organization = await createOrganization({ kind: "school" });

  const [owner, teammate, course] = await Promise.all([
    createE2EUser(getBaseURL(), { orgRole: "owner", orgSlug: organization.slug }),
    createE2EUser(getBaseURL(), { orgRole: "member", orgSlug: organization.slug }),
    courseFixture({
      isPublished: true,
      organizationId: organization.id,
      title: "Enfermedad de La Peyronie",
    }),
  ]);

  const [tag, teammateMember] = await Promise.all([
    prisma.memberTag.create({ data: { name: "funcio:msl", organizationId: organization.id } }),
    prisma.member.findFirstOrThrow({
      where: { organizationId: organization.id, userId: teammate.id },
    }),
  ]);

  await prisma.memberTagLink.create({ data: { memberId: teammateMember.id, tagId: tag.id } });

  return { course, organization, owner, tag, teammate };
}

test.describe("Organization Assignments", () => {
  test("an owner requires a course from a segment and its members are included", async ({
    browser,
  }) => {
    const { course, organization, owner, tag, teammate } = await assignableFixture();

    const context = await browser.newContext({ storageState: owner.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/assignments`);

    const form = page.getByRole("form", { name: /assign a course/iu });

    await form.getByLabel(/^course$/iu).selectOption({ label: course.title });
    await form.getByRole("checkbox", { name: tag.name }).check();
    await form.getByRole("button", { name: /assign course/iu }).click();

    await expect(form.getByText(/course assigned/iu)).toBeVisible();

    const list = page.getByRole("region", { name: /current assignments/iu });

    await expect(list.getByText(course.title)).toBeVisible();
    await expect(list.getByText(/reaches 1 person/iu)).toBeVisible();

    const recipients = await prisma.assignmentRecipient.findMany({
      where: { assignment: { courseId: course.id }, removedAt: null },
    });

    expect(recipients.map((row) => row.userId)).toStrictEqual([teammate.id]);
    expect(recipients[0]?.matchedTagId).toBe(tag.id);

    await context.close();
  });

  test("assigning without choosing anyone explains what is missing", async ({ browser }) => {
    const { organization, owner } = await assignableFixture();

    const context = await browser.newContext({ storageState: owner.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/assignments`);

    const form = page.getByRole("form", { name: /assign a course/iu });

    await form.getByRole("button", { name: /assign course/iu }).click();

    await expect(form.getByText(/choose at least one segment or person/iu)).toBeVisible();

    await context.close();
  });

  test("a plain member cannot open the assignments page", async ({ browser }) => {
    const organization = await createOrganization({ kind: "school" });

    const plainMember = await createE2EUser(getBaseURL(), {
      orgRole: "member",
      orgSlug: organization.slug,
    });

    const context = await browser.newContext({ storageState: plainMember.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/assignments`);

    await expect(page.getByRole("form")).toHaveCount(0);

    await context.close();
  });
});
