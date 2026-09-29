import { prisma } from "@zoonk/db";
import { getBaseURL } from "@zoonk/e2e/fixtures/base-url";
import { createOrganization } from "@zoonk/e2e/fixtures/orgs";
import { createE2EUser } from "@zoonk/e2e/fixtures/users";
import { chapterFixture } from "@zoonk/testing/fixtures/chapters";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { expect, test } from "./fixtures";

/** One organization course with a chapter, required from a learner who belongs to it. */
async function assignedCourseFixture() {
  const organization = await createOrganization({ kind: "school" });

  const [owner, learner, course] = await Promise.all([
    createE2EUser(getBaseURL(), { orgRole: "owner", orgSlug: organization.slug }),
    createE2EUser(getBaseURL(), { orgRole: "member", orgSlug: organization.slug }),
    courseFixture({
      isPublished: true,
      language: "en",
      organizationId: organization.id,
      title: "Peyronie's disease for field teams",
    }),
  ]);

  const [chapter, learnerMember] = await Promise.all([
    chapterFixture({
      courseId: course.id,
      isPublished: true,
      language: "en",
      organizationId: organization.id,
      title: "Pathophysiology of the tunica albuginea",
    }),
    prisma.member.findFirstOrThrow({
      where: { organizationId: organization.id, userId: learner.id },
    }),
  ]);

  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      createdById: owner.id,
      minDailySeconds: 180,
      organizationId: organization.id,
    },
  });

  await prisma.assignmentRecipient.create({
    data: { assignmentId: assignment.id, memberId: learnerMember.id, userId: learner.id },
  });

  return { chapter, course, learner, organization };
}

test.describe("Organization Learner", () => {
  test("a learner finds the assigned course in My Courses and opens it", async ({ browser }) => {
    const { chapter, course, learner } = await assignedCourseFixture();

    const context = await browser.newContext({ storageState: learner.storageState });
    const page = await context.newPage();

    await page.goto("/my");

    const assigned = page.getByRole("region", { name: /assigned to you/iu });

    await expect(assigned.getByText(/3 min\/day/iu)).toBeVisible();
    await assigned.getByRole("link", { name: new RegExp(course.title, "iu") }).click();

    await expect(page.getByText(chapter.title)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/iu);

    await context.close();
  });

  test("a learner sees their own weekly habit and who can see it", async ({ browser }) => {
    const { learner } = await assignedCourseFixture();

    // The E2E server has no location header, so the learner-local day is UTC.
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

    await prisma.dailyProgress.create({
      data: {
        date: today,
        dayOfWeek: today.getUTCDay(),
        timeSpentSeconds: 120,
        userId: learner.id,
      },
    });

    const context = await browser.newContext({ storageState: learner.storageState });
    const page = await context.newPage();

    await page.goto("/my");

    const habit = page.getByRole("region", { name: /your habit/iu });

    await expect(habit.getByText(/2 of 3 min/iu)).toBeVisible();
    await expect(habit.getByText(/only you can see your habit/iu)).toBeVisible();

    await context.close();
  });

  test("the web app is installable and ships its reminder worker", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");

    expect(manifest.ok()).toBe(true);

    await expect(manifest.json()).resolves.toMatchObject({
      display: "standalone",
      start_url: "/my",
    });

    const worker = await request.get("/sw.js");

    expect(worker.ok()).toBe(true);
    expect(worker.headers()["content-type"]).toMatch(/javascript/iu);
  });

  /**
   * Headless Chromium always reports notifications as denied, whatever
   * permission the context grants, so the subscription itself can only be
   * exercised in a real browser. This covers what headless can observe: the
   * learner always gets either the control or the reason it is unavailable.
   */
  test("a learner is offered reminders or told why they are unavailable", async ({ browser }) => {
    const { learner } = await assignedCourseFixture();

    const context = await browser.newContext({ storageState: learner.storageState });
    const page = await context.newPage();

    await page.goto("/my");

    const habit = page.getByRole("region", { name: /your habit/iu });

    await expect(
      habit
        .getByRole("button", { name: /remind me on weekdays/iu })
        .or(habit.getByText(/notifications are blocked/iu)),
    ).toBeVisible();

    await context.close();
  });

  test("someone outside the organization cannot open its course", async ({ browser }) => {
    const { chapter, course, organization } = await assignedCourseFixture();
    const outsider = await createE2EUser(getBaseURL());

    const context = await browser.newContext({ storageState: outsider.storageState });
    const page = await context.newPage();

    await page.goto(`/b/${organization.slug}/c/${course.slug}`);

    await expect(page.getByText(chapter.title)).toHaveCount(0);

    await context.close();
  });
});
