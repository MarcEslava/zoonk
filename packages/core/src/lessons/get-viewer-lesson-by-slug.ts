import "server-only";
import { getPublishedLessonWhere, prisma } from "@zoonk/db";
import { cacheTag } from "next/cache";
import { getChapterCacheTag, getCourseCacheTag, getLessonCacheTag } from "../cache/tags";
import { decodeRouteParam } from "../navigation/decode-route-param";
import { getSession } from "../users/get-session";
import { type CatalogLesson, getLesson } from "./get-lesson-by-slug";

type LessonRouteParams = {
  brandSlug: string;
  chapterSlug: string;
  courseSlug: string;
  lessonSlug: string;
};

/**
 * Member-only lesson read, kept per viewer for the same reason as the course:
 * the shared public read must never carry one member's access decision.
 */
async function getMemberLesson(params: LessonRouteParams): Promise<CatalogLesson | null> {
  "use cache: private";

  const session = await getSession();

  if (!session) {
    return null;
  }

  const lesson = await prisma.lesson.findFirst({
    include: { chapter: { include: { course: true } } },
    where: getPublishedLessonWhere({
      chapterWhere: { slug: params.chapterSlug },
      courseWhere: {
        organization: { members: { some: { userId: session.user.id } }, slug: params.brandSlug },
        slug: params.courseSlug,
      },
      lessonWhere: { slug: params.lessonSlug },
    }),
  });

  if (lesson) {
    cacheTag(
      getCourseCacheTag(lesson.chapter.course.id),
      getChapterCacheTag(lesson.chapter.id),
      getLessonCacheTag(lesson.id),
    );
  }

  return lesson;
}

/** Resolves a lesson route for the current viewer, public read first. */
export async function getViewerLesson(params: LessonRouteParams) {
  const publicLesson = await getLesson(params);

  if (publicLesson) {
    return publicLesson;
  }

  return getMemberLesson({
    brandSlug: decodeRouteParam(params.brandSlug),
    chapterSlug: decodeRouteParam(params.chapterSlug),
    courseSlug: decodeRouteParam(params.courseSlug),
    lessonSlug: decodeRouteParam(params.lessonSlug),
  });
}
