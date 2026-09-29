import { type GenerationStatus, getPublishedLessonWhere } from "@zoonk/db";
import { getOrganizationMemberCourseWhere } from "../../../courses/organization-membership";

/**
 * Player write commands must only act on lessons the learner can reach through
 * the product. Public brand courses are always eligible, user-owned
 * organization-less courses only for their owner, and an organization's
 * courses for its members. This mirrors the read rule in `lessons/read-access`
 * so a lesson a member can open is also one whose completion is recorded.
 */
export function getCompletableLessonWhere({
  generationStatus,
  lessonId,
  userId,
}: {
  generationStatus?: GenerationStatus;
  lessonId: string;
  userId: string;
}) {
  return getPublishedLessonWhere({
    courseWhere: {
      OR: [
        { organization: { kind: "brand" } },
        { organizationId: null, userId },
        getOrganizationMemberCourseWhere(userId),
      ],
    },
    lessonWhere: { generationStatus, id: lessonId },
  });
}
