import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Lists the courses someone may require from their team.
 *
 * Only the organization's own published curriculum is offered. Public catalog
 * courses are assignable too, but the catalog is far too large for a picker, so
 * choosing one belongs to a search flow rather than to this list. Returns null
 * when the caller may not assign, so a page can tell that apart from no courses.
 */
export async function listAssignableCourses({ organizationId }: { organizationId: string }) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { assignment: ["create"] },
  });

  if (access.status !== "ready") {
    return null;
  }

  return prisma.course.findMany({
    orderBy: { title: "asc" },
    where: { isPublished: true, organizationId },
  });
}
