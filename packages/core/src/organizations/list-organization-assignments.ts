import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Lists what an organization currently requires, with who it was asked of and
 * how many people it reaches today. Returns the access outcome when the caller
 * may not read assignments.
 */
export async function listOrganizationAssignments({ organizationId }: { organizationId: string }) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { assignment: ["read"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const assignments = await prisma.assignment.findMany({
    include: {
      _count: { select: { recipients: { where: { removedAt: null } } } },
      course: true,
      targets: { include: { member: { include: { user: true } }, tag: true } },
    },
    orderBy: { createdAt: "desc" },
    where: { organizationId },
  });

  return {
    assignments: assignments.map((assignment) => ({
      course: assignment.course,
      dueAt: assignment.dueAt,
      id: assignment.id,
      minDailySeconds: assignment.minDailySeconds,
      openRecipientCount: assignment._count.recipients,
      targetMembers: assignment.targets.flatMap((target) => target.member?.user.name ?? []),
      targetTags: assignment.targets.flatMap((target) => target.tag?.name ?? []),
    })),
    status: "ready" as const,
  };
}
