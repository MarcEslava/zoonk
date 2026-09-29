import { type listAssignableCourses } from "@zoonk/core/organizations/list-assignable-courses";
import { type listOrganizationAssignments } from "@zoonk/core/organizations/list-assignments";
import { type listCurrentUserAssignments } from "@zoonk/core/organizations/list-current-user-assignments";
import { type listCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";
import { type listOrganizationMembers } from "@zoonk/core/organizations/list-members";
import { errors } from "./api-errors";
import { toOrganizationSummary } from "./catalog-responses";

type ReadyResult<TRead extends (...args: never[]) => Promise<unknown>> = Extract<
  Awaited<ReturnType<TRead>>,
  { status: "ready" }
>;

type CurrentUserOrganization = Awaited<ReturnType<typeof listCurrentUserOrganizations>>[number];
type CurrentUserAssignment = Awaited<ReturnType<typeof listCurrentUserAssignments>>[number];
type OrganizationCourse = ReadyResult<typeof listAssignableCourses>["courses"][number];
type OrganizationMember = ReadyResult<typeof listOrganizationMembers>["members"][number];

type OrganizationAssignment = ReadyResult<
  typeof listOrganizationAssignments
>["assignments"][number];

/**
 * Maps a refused organization capability to its HTTP error. A non-member gets
 * 404 like an unknown organization, so the API never confirms that another
 * customer's organization exists.
 */
export function organizationAccessError(
  status: "forbidden" | "notFound" | "unauthorized",
  notFoundMessage = "Organization not found",
) {
  if (status === "unauthorized") {
    return errors.unauthorized();
  }

  if (status === "forbidden") {
    return errors.forbidden();
  }

  return errors.notFound(notFoundMessage);
}

export function toOrganizationCourse(course: OrganizationCourse) {
  return {
    id: course.id,
    imageUrl: course.imageUrl,
    language: course.language,
    slug: course.slug,
    title: course.title,
  };
}

export function toCurrentUserOrganization(membership: CurrentUserOrganization) {
  return { organization: toOrganizationSummary(membership.organization), role: membership.role };
}

/**
 * Serializes the learner's live obligations. A course always belongs to an
 * organization here, because assignments only target organization and brand
 * courses, so a row without one is dropped rather than published with a null
 * owner.
 */
export function toCurrentUserAssignments(assignments: CurrentUserAssignment[]) {
  return assignments.flatMap((assignment) =>
    assignment.organization
      ? [
          {
            assignedAt: assignment.assignedAt,
            course: toOrganizationCourse(assignment.course),
            dueAt: assignment.dueAt,
            id: assignment.id,
            minDailySeconds: assignment.minDailySeconds,
            organization: toOrganizationSummary(assignment.organization),
          },
        ]
      : [],
  );
}

export function toMemberTag(tag: { id: string; name: string }) {
  return { id: tag.id, name: tag.name };
}

export function toOrganizationMember(member: OrganizationMember) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    tags: member.tags.map((tag) => toMemberTag(tag)),
  };
}

export function toOrganizationAssignment(assignment: OrganizationAssignment) {
  return {
    course: toOrganizationCourse(assignment.course),
    dueAt: assignment.dueAt,
    id: assignment.id,
    minDailySeconds: assignment.minDailySeconds,
    openRecipientCount: assignment.openRecipientCount,
    targetMembers: assignment.targetMembers,
    targetTags: assignment.targetTags,
  };
}

export function toReminderSchedule(schedule: { hour: number; timeZone: string } | null) {
  return { schedule: schedule && { hour: schedule.hour, timeZone: schedule.timeZone } };
}
