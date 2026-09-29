import { prisma } from "@zoonk/db";
import { getBaseURL } from "@zoonk/e2e/fixtures/base-url";
import { createOrganization } from "@zoonk/e2e/fixtures/orgs";
import { createE2EUser } from "@zoonk/e2e/fixtures/users";
import { chapterFixture } from "@zoonk/testing/fixtures/chapters";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { lessonFixture } from "@zoonk/testing/fixtures/lessons";
import { stepFixture } from "@zoonk/testing/fixtures/steps";
import { expect, test } from "./fixtures";

const GENERATED_ANSWER = "Infection of the tunica albuginea";
const CORRECTED_ANSWER = "Fibrous plaque in the tunica albuginea";

/** An organization lesson with one generated question and two people to review it. */
async function reviewFixture() {
  const organization = await createOrganization({ kind: "school" });

  const [editor, reviewer, course] = await Promise.all([
    createE2EUser(getBaseURL(), { orgRole: "admin", orgSlug: organization.slug }),
    createE2EUser(getBaseURL(), { orgRole: "owner", orgSlug: organization.slug }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const chapter = await chapterFixture({
    courseId: course.id,
    isPublished: true,
    organizationId: organization.id,
  });

  const lesson = await lessonFixture({
    chapterId: chapter.id,
    isPublished: true,
    organizationId: organization.id,
    title: "Peyronie's disease: causes",
  });

  const step = await stepFixture({
    content: {
      options: [
        { feedback: "Right.", id: "a", isCorrect: true, text: GENERATED_ANSWER },
        { feedback: "No.", id: "b", isCorrect: false, text: "Low testosterone" },
      ],
      question: "What causes the curvature?",
    },
    isPublished: true,
    kind: "multipleChoice",
    lessonId: lesson.id,
  });

  return { course, editor, lesson, organization, reviewer, step };
}

test.describe("Lesson review", () => {
  test("a correction waits for someone else to approve it", async ({ browser }) => {
    const { editor, lesson, organization, reviewer, step } = await reviewFixture();
    const reviewURL = `/org/${organization.slug}/lessons/${lesson.id}`;

    const editorContext = await browser.newContext({ storageState: editor.storageState });
    const editorPage = await editorContext.newPage();

    await editorPage.goto(reviewURL);

    const form = editorPage.getByRole("form", { name: /edit step 1/iu });

    await form
      .getByLabel(/^answer$/iu)
      .first()
      .fill(CORRECTED_ANSWER);

    await form.getByRole("button", { name: /save draft/iu }).click();

    await expect(form.getByText(/draft saved/iu)).toBeVisible();
    await expect(editorPage.getByText(/someone else has to approve it/iu)).toBeVisible();
    await expect(editorPage.getByRole("form", { name: /approve lesson/iu })).toHaveCount(0);

    await expect(prisma.step.findUniqueOrThrow({ where: { id: step.id } })).resolves.toMatchObject({
      content: { options: [{ text: GENERATED_ANSWER }, {}] },
    });

    await editorContext.close();

    const reviewerContext = await browser.newContext({ storageState: reviewer.storageState });
    const reviewerPage = await reviewerContext.newPage();

    await reviewerPage.goto(reviewURL);

    await expect(reviewerPage.getByText(/draft by/iu)).toBeVisible();

    const approval = reviewerPage.getByRole("form", { name: /approve lesson/iu });

    await approval.getByRole("button", { name: /approve and publish/iu }).click();

    await expect(reviewerPage.getByText(/your team sees exactly what is below/iu)).toBeVisible();

    await expect(prisma.step.findUniqueOrThrow({ where: { id: step.id } })).resolves.toMatchObject({
      content: { options: [{ text: CORRECTED_ANSWER }, {}] },
    });

    await expect(
      reviewerPage.getByRole("region", { name: /history/iu }).getByText(/^approved$/iu),
    ).toBeVisible();

    await reviewerContext.close();
  });

  test("discarding a draft returns the step to its approved wording", async ({ browser }) => {
    const { editor, lesson, organization, step } = await reviewFixture();

    const context = await browser.newContext({ storageState: editor.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/lessons/${lesson.id}`);

    const form = page.getByRole("form", { name: /edit step 1/iu });
    const answer = form.getByLabel(/^answer$/iu).first();

    await answer.fill(CORRECTED_ANSWER);
    await form.getByRole("button", { name: /save draft/iu }).click();
    await expect(form.getByText(/draft saved/iu)).toBeVisible();

    await form.getByRole("button", { name: /discard draft/iu }).click();

    await expect(answer).toHaveValue(GENERATED_ANSWER);
    await expect(form.getByRole("button", { name: /discard draft/iu })).toHaveCount(0);
    await expect(prisma.stepDraft.count({ where: { stepId: step.id } })).resolves.toBe(0);

    await context.close();
  });

  test("a plain member cannot open the review", async ({ browser }) => {
    const { lesson, organization } = await reviewFixture();

    const member = await createE2EUser(getBaseURL(), {
      orgRole: "member",
      orgSlug: organization.slug,
    });

    const context = await browser.newContext({ storageState: member.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/lessons/${lesson.id}`);

    await expect(page.getByRole("form")).toHaveCount(0);

    await context.close();
  });

  test("a course outline shows which lessons wait for approval", async ({ browser }) => {
    const { course, editor, lesson, organization, reviewer, step } = await reviewFixture();

    await prisma.stepDraft.create({
      data: { content: {}, editedById: editor.id, stepId: step.id },
    });

    const context = await browser.newContext({ storageState: reviewer.storageState });
    const page = await context.newPage();

    await page.goto(`/org/${organization.slug}/courses`);
    await page.getByRole("link", { name: course.title }).click();

    await expect(page.getByText(lesson.title ?? "")).toBeVisible();
    await expect(page.getByText(/1 change to approve/iu)).toBeVisible();

    await context.close();
  });
});
