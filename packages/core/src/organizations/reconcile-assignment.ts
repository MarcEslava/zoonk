import "server-only";
import { prisma } from "@zoonk/db";
import { reconcileAssignmentRecipients } from "./_utils/reconcile-recipients";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Brings one assignment's recipients back in line with who currently matches it.
 *
 * Materialized obligations do not follow tag changes on their own, so this is
 * what applies a standing assignment to whoever joined a segment since it was
 * created, and closes the period for whoever left. Closing keeps the row: the
 * question an audit asks is what was required on a past date.
 */
export async function reconcileAssignment({ assignmentId }: { assignmentId: string }) {
  const assignment = await prisma.assignment.findUnique({
    include: { targets: true },
    where: { id: assignmentId },
  });

  if (!assignment) {
    return { status: "notFound" as const };
  }

  const access = await getOrganizationAccess({
    organizationId: assignment.organizationId,
    permissions: { assignment: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const result = await reconcileAssignmentRecipients({ assignment });

  return { ...result, status: "reconciled" as const };
}
