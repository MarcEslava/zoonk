import "server-only";
import { getPublishedCourseWhere, prisma } from "@zoonk/db";
import { cacheTag } from "next/cache";
import { getCourseCacheTag } from "../cache/tags";
import { decodeRouteParam } from "../navigation/decode-route-param";
import { getSession } from "../users/get-session";
import { type CourseWithDetails, getCourse } from "./get-course-by-slug";

type CourseRouteParams = { brandSlug: string; courseSlug: string };

/**
 * An organization's course is visible to its members only, so this read runs
 * per viewer. It deliberately stays out of the shared public read, which would
 * otherwise store one member's access decision and serve it to everyone.
 */
async function getMemberCourse(params: CourseRouteParams): Promise<CourseWithDetails | null> {
  "use cache: private";

  const session = await getSession();

  if (!session) {
    return null;
  }

  const course = await prisma.course.findFirst({
    include: { categories: true, organization: true },
    where: getPublishedCourseWhere({
      organization: { members: { some: { userId: session.user.id } }, slug: params.brandSlug },
      slug: params.courseSlug,
    }),
  });

  if (course) {
    cacheTag(getCourseCacheTag(course.id));
  }

  return course;
}

/**
 * Resolves a catalog course route for the current viewer: the shared public
 * read first, then the member-only read when the course belongs to an
 * organization. The public path never touches the session, so public course
 * pages keep their shared cache and static shell.
 */
export async function getViewerCourse(params: CourseRouteParams) {
  const publicCourse = await getCourse(params);

  if (publicCourse) {
    return publicCourse;
  }

  return getMemberCourse({
    brandSlug: decodeRouteParam(params.brandSlug),
    courseSlug: decodeRouteParam(params.courseSlug),
  });
}
