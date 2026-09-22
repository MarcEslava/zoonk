import { getPublishedLessonWhere } from "@zoonk/db";
import { getOrganizationMemberCourseWhere } from "../courses/organization-membership";

/**
 * Restricts raw-ID player reads to curriculum the caller may see. Brand
 * courses are public to every caller, organization-less personal courses are
 * visible only to their owner, and an organization's courses are visible to
 * its members. Every caller of this helper runs uncached or per viewer, which
 * a shared cache would break by storing one member's access decision.
 */
export function getReadableLessonWhere({
  lessonId,
  userId,
}: {
  lessonId: string;
  userId: string | null;
}) {
  return getPublishedLessonWhere({
    courseWhere: userId
      ? {
          OR: [
            { organization: { kind: "brand" } },
            { organizationId: null, userId },
            getOrganizationMemberCourseWhere(userId),
          ],
        }
      : { organization: { kind: "brand" } },
    lessonWhere: { id: lessonId },
  });
}
