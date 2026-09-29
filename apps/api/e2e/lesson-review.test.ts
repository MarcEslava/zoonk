import { prisma } from "@zoonk/db";
import { expect, test } from "@zoonk/e2e/fixtures";
import { chapterFixture } from "@zoonk/testing/fixtures/chapters";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { lessonFixture } from "@zoonk/testing/fixtures/lessons";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { stepFixture } from "@zoonk/testing/fixtures/steps";
import { createAuthenticatedApiContext } from "./helpers/auth";

const HTTP_NO_CONTENT = 204;

function getBaseURL() {
  return process.env.E2E_BASE_URL ?? "";
}

function sortEdit(items: string[]) {
  return {
    content: { feedback: "Diagnosis comes before treatment.", items, question: "Order the steps" },
    kind: "sortOrder",
  };
}

/** An organization lesson with one sort question, an admin editor and an owner reviewer. */
async function reviewFixture() {
  const [editor, reviewer, organization] = await Promise.all([
    createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: "review-editor" }),
    createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: "review-owner" }),
    organizationFixture({ kind: "school" }),
  ]);

  const course = await courseFixture({ isPublished: true, organizationId: organization.id });

  const chapter = await chapterFixture({
    courseId: course.id,
    isPublished: true,
    organizationId: organization.id,
  });

  const lesson = await lessonFixture({
    chapterId: chapter.id,
    isPublished: true,
    organizationId: organization.id,
  });

  const [step] = await Promise.all([
    stepFixture({
      content: sortEdit(["Treatment", "Diagnosis"]).content,
      isPublished: true,
      kind: "sortOrder",
      lessonId: lesson.id,
    }),
    organizationMemberFixture({
      organizationId: organization.id,
      role: "admin",
      userId: editor.user.id,
    }),
    organizationMemberFixture({
      organizationId: organization.id,
      role: "owner",
      userId: reviewer.user.id,
    }),
  ]);

  return { course, editor, lesson, organization, reviewer, step };
}

test.describe("Lesson review resources", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("a correction waits for a second person to approve it", async () => {
    const { editor, lesson, reviewer, step } = await reviewFixture();

    const saved = await editor.apiContext.put(`/v1/steps/${step.id}/draft`, {
      data: sortEdit(["Diagnosis", "Treatment"]),
    });

    expect(saved.status()).toBe(HTTP_NO_CONTENT);

    const ownApproval = await editor.apiContext.post(`/v1/lessons/${lesson.id}/approval`);

    expect(ownApproval.status()).toBe(403);

    const review = await reviewer.apiContext.get(`/v1/lessons/${lesson.id}/review`);

    expect(await review.json()).toMatchObject({
      canApprove: true,
      steps: [
        {
          content: { items: ["Treatment", "Diagnosis"] },
          draft: { edit: { content: { items: ["Diagnosis", "Treatment"] }, kind: "sortOrder" } },
          id: step.id,
          isEditable: true,
          kind: "sortOrder",
        },
      ],
    });

    const approved = await reviewer.apiContext.post(`/v1/lessons/${lesson.id}/approval`);

    expect(await approved.json()).toStrictEqual({ approvedDrafts: 1 });

    const again = await reviewer.apiContext.post(`/v1/lessons/${lesson.id}/approval`);

    expect(again.status()).toBe(409);

    await expect(prisma.step.findUniqueOrThrow({ where: { id: step.id } })).resolves.toMatchObject({
      content: { items: ["Diagnosis", "Treatment"] },
    });

    await Promise.all([editor.apiContext.dispose(), reviewer.apiContext.dispose()]);
  });

  test("rejects content the player could not use and discards drafts", async () => {
    const { editor, step } = await reviewFixture();
    const endpoint = `/v1/steps/${step.id}/draft`;

    const tooShort = await editor.apiContext.put(endpoint, { data: sortEdit(["Diagnosis"]) });

    expect(tooShort.status()).toBe(422);

    await editor.apiContext.put(endpoint, { data: sortEdit(["Diagnosis", "Treatment"]) });

    const discarded = await editor.apiContext.delete(endpoint);

    expect(discarded.status()).toBe(HTTP_NO_CONTENT);
    await expect(prisma.stepDraft.count({ where: { stepId: step.id } })).resolves.toBe(0);

    await editor.apiContext.dispose();
  });

  test("lists and outlines an organization's courses for its reviewers only", async () => {
    const [{ course, editor, lesson, organization }, outsider] = await Promise.all([
      reviewFixture(),
      createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: "review-outsider" }),
    ]);

    const [courses, outline, hidden] = await Promise.all([
      editor.apiContext.get(`/v1/organizations/${organization.id}/courses`),
      editor.apiContext.get(`/v1/courses/${course.id}/review`),
      outsider.apiContext.get(`/v1/lessons/${lesson.id}/review`),
    ]);

    expect(await courses.json()).toMatchObject({ data: [{ id: course.id }] });

    expect(await outline.json()).toMatchObject({
      chapters: [{ lessons: [{ draftCount: 0, id: lesson.id, isPublished: true }] }],
      course: { id: course.id },
    });

    expect(hidden.status()).toBe(404);

    await Promise.all([editor.apiContext.dispose(), outsider.apiContext.dispose()]);
  });
});
