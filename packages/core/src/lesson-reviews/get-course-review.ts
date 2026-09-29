import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "../organizations/get-organization-access";
import { getSession } from "../users/get-session";

/**
 * Outlines one organization course for review: every chapter and lesson,
 * published or not, with how many corrections wait on each lesson.
 */
export async function getCourseReview({ courseId }: { courseId: string }) {
  const session = await getSession();

  if (!session) {
    return { status: "unauthorized" as const };
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course?.organizationId) {
    return { status: "notFound" as const };
  }

  const access = await getOrganizationAccess({
    organizationId: course.organizationId,
    permissions: { course: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const chapters = await prisma.chapter.findMany({
    include: {
      lessons: {
        include: { _count: { select: { steps: { where: { draft: { isNot: null } } } } } },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
    where: { courseId },
  });

  return {
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      lessons: chapter.lessons.map((lesson) => ({
        draftCount: lesson._count.steps,
        id: lesson.id,
        isPublished: lesson.isPublished,
        title: lesson.title,
      })),
      title: chapter.title,
    })),
    course: {
      id: course.id,
      isPublished: course.isPublished,
      organizationId: course.organizationId,
      title: course.title,
    },
    status: "ready" as const,
  };
}
