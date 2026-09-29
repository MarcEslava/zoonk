import "server-only";
import { getPublishedChapterWhere, prisma } from "@zoonk/db";
import { cacheTag } from "next/cache";
import { getChapterCacheTag, getCourseCacheTag } from "../cache/tags";
import { decodeRouteParam } from "../navigation/decode-route-param";
import { getSession } from "../users/get-session";
import { type ChapterWithDetails, getChapter } from "./get-chapter-by-slug";

type ChapterRouteParams = { brandSlug: string; chapterSlug: string; courseSlug: string };

/**
 * Member-only chapter read, kept per viewer for the same reason as the course:
 * the shared public read must never carry one member's access decision.
 */
async function getMemberChapter(params: ChapterRouteParams): Promise<ChapterWithDetails | null> {
  "use cache: private";

  const session = await getSession();

  if (!session) {
    return null;
  }

  const chapter = await prisma.chapter.findFirst({
    include: { course: { include: { categories: true } } },
    where: getPublishedChapterWhere({
      chapterWhere: { slug: params.chapterSlug },
      courseWhere: {
        organization: { members: { some: { userId: session.user.id } }, slug: params.brandSlug },
        slug: params.courseSlug,
      },
    }),
  });

  if (chapter) {
    cacheTag(getChapterCacheTag(chapter.id), getCourseCacheTag(chapter.course.id));
  }

  return chapter;
}

/** Resolves a chapter route for the current viewer, public read first. */
export async function getViewerChapter(params: ChapterRouteParams) {
  const publicChapter = await getChapter(params);

  if (publicChapter) {
    return publicChapter;
  }

  return getMemberChapter({
    brandSlug: decodeRouteParam(params.brandSlug),
    chapterSlug: decodeRouteParam(params.chapterSlug),
    courseSlug: decodeRouteParam(params.courseSlug),
  });
}
