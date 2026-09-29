import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "../organizations/get-organization-access";

/**
 * Lists an organization's own courses for review, drafts included, since a
 * course is reviewed before anyone can take it.
 */
export async function listReviewCourses({ organizationId }: { organizationId: string }) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { course: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    where: { organizationId },
  });

  return {
    courses: courses.map((course) => ({
      id: course.id,
      imageUrl: course.imageUrl,
      isPublished: course.isPublished,
      title: course.title,
    })),
    status: "ready" as const,
  };
}
