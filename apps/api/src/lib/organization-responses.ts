import { type listCurrentUserAssignments } from "@zoonk/core/organizations/list-current-user-assignments";
import { type listCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";
import { toOrganizationSummary } from "./catalog-responses";

type CurrentUserOrganization = Awaited<ReturnType<typeof listCurrentUserOrganizations>>[number];
type CurrentUserAssignment = Awaited<ReturnType<typeof listCurrentUserAssignments>>[number];

export function toCurrentUserOrganization(membership: CurrentUserOrganization) {
  return { organization: toOrganizationSummary(membership.organization), role: membership.role };
}

/**
 * Serializes one live obligation. A course always belongs to an organization
 * here, because assignments only target organization and brand courses, so a
 * row without one is dropped rather than published with a null owner.
 */
export function toCurrentUserAssignments(assignments: CurrentUserAssignment[]) {
  return assignments.flatMap((assignment) =>
    assignment.organization
      ? [
          {
            assignedAt: assignment.assignedAt,
            course: {
              id: assignment.course.id,
              imageUrl: assignment.course.imageUrl,
              language: assignment.course.language,
              slug: assignment.course.slug,
              title: assignment.course.title,
            },
            dueAt: assignment.dueAt,
            id: assignment.id,
            minDailySeconds: assignment.minDailySeconds,
            organization: toOrganizationSummary(assignment.organization),
          },
        ]
      : [],
  );
}
