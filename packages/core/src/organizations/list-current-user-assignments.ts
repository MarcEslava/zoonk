import "server-only";
import { prisma } from "@zoonk/db";
import { getSession } from "../users/get-session";

/**
 * Lists what the signed-in learner is currently required to complete.
 *
 * Only open periods count, and only while the learner still belongs to the
 * organization: a period whose member has been removed is waiting for
 * reconciliation to close it and no longer describes a live obligation.
 *
 * This read stays uncached because an assignment's freshness is the point. Its
 * invalidation contract belongs with the screen that displays it rather than
 * with a blanket cache here.
 */
export async function listCurrentUserAssignments() {
  const session = await getSession();

  if (!session) {
    return [];
  }

  const periods = await prisma.assignmentRecipient.findMany({
    include: { assignment: { include: { course: { include: { organization: true } } } } },
    orderBy: [{ assignment: { dueAt: "asc" } }, { assignedAt: "desc" }],
    where: { memberId: { not: null }, removedAt: null, userId: session.user.id },
  });

  return periods.map((period) => ({
    assignedAt: period.assignedAt,
    course: period.assignment.course,
    dueAt: period.assignment.dueAt,
    id: period.assignment.id,
    minDailySeconds: period.assignment.minDailySeconds,
    organization: period.assignment.course.organization,
  }));
}

/**
 * Wraps the learner's obligations as a current-user resource so delivery
 * adapters can tell missing authentication apart from having none.
 */
export async function getCurrentUserAssignments() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return { assignments: await listCurrentUserAssignments() };
}
