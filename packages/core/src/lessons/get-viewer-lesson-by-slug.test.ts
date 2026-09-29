import { chapterFixture } from "@zoonk/testing/fixtures/chapters";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { lessonFixture } from "@zoonk/testing/fixtures/lessons";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { getViewerChapter } from "../chapters/get-viewer-chapter-by-slug";
import { getViewerLesson } from "./get-viewer-lesson-by-slug";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

/** One organization's published course, chapter and lesson, with a member and an outsider. */
async function organizationLessonFixture() {
  const [member, outsider, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, userId: member.id }),
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
  });

  const params = {
    brandSlug: organization.slug,
    chapterSlug: chapter.slug,
    courseSlug: course.slug,
    lessonSlug: lesson.slug,
  };

  return { chapter, lesson, member, outsider, params };
}

describe(getViewerLesson, () => {
  beforeEach(() => mockSession(null));

  it("serves an organization lesson to one of its members", async () => {
    const { lesson, member, params } = await organizationLessonFixture();

    mockSession(member.id);

    await expect(getViewerLesson(params)).resolves.toMatchObject({ id: lesson.id });
  });

  it("hides an organization lesson from someone outside it", async () => {
    const { outsider, params } = await organizationLessonFixture();

    mockSession(outsider.id);

    await expect(getViewerLesson(params)).resolves.toBeNull();
  });
});

describe(getViewerChapter, () => {
  beforeEach(() => mockSession(null));

  it("serves an organization chapter to one of its members", async () => {
    const { chapter, member, params } = await organizationLessonFixture();

    mockSession(member.id);

    await expect(getViewerChapter(params)).resolves.toMatchObject({ id: chapter.id });
  });

  it("hides an organization chapter from a guest", async () => {
    const { params } = await organizationLessonFixture();

    await expect(getViewerChapter(params)).resolves.toBeNull();
  });
});
