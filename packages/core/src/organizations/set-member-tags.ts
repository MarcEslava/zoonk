import "server-only";
import { prisma } from "@zoonk/db";
import { reconcileAssignmentRecipients } from "./_utils/reconcile-recipients";
import { getOrganizationAccess } from "./get-organization-access";

/** Only the tags that entered or left need their assignments revisited. */
function getAffectedTagIds({ current, next }: { current: string[]; next: string[] }): string[] {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return [
    ...current.filter((tagId) => !nextSet.has(tagId)),
    ...next.filter((tagId) => !currentSet.has(tagId)),
  ];
}

/**
 * Replaces one member's segments and immediately applies the consequence.
 *
 * Moving someone between segments changes what their organization requires of
 * them, so the standing assignments touching either the old or the new tags are
 * reconciled here instead of waiting for someone to run it by hand. Replacing
 * and reconciling are separate transactions: reconciliation is idempotent, so
 * the worst case of a failure between them is work that a later run repeats.
 */
export async function setMemberTags({ memberId, tagIds }: { memberId: string; tagIds: string[] }) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });

  if (!member) {
    return { status: "notFound" as const };
  }

  const access = await getOrganizationAccess({
    organizationId: member.organizationId,
    permissions: { member: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const next = [...new Set(tagIds)];

  const [tags, links] = await Promise.all([
    prisma.memberTag.findMany({
      select: { id: true },
      where: { id: { in: next }, organizationId: member.organizationId },
    }),
    prisma.memberTagLink.findMany({ select: { tagId: true }, where: { memberId } }),
  ]);

  if (tags.length !== next.length) {
    return { status: "invalidTags" as const };
  }

  const current = links.map((link) => link.tagId);
  const affectedTagIds = getAffectedTagIds({ current, next });

  if (affectedTagIds.length === 0) {
    return { reconciledAssignments: 0, status: "updated" as const };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.memberTagLink.deleteMany({ where: { memberId } });

    if (next.length > 0) {
      await transaction.memberTagLink.createMany({
        data: next.map((tagId) => ({ memberId, tagId })),
      });
    }
  });

  const assignments = await prisma.assignment.findMany({
    include: { targets: true },
    where: {
      organizationId: member.organizationId,
      targets: { some: { tagId: { in: affectedTagIds } } },
    },
  });

  // Each assignment owns its own recipient rows, so they reconcile independently.
  await Promise.all(assignments.map((assignment) => reconcileAssignmentRecipients({ assignment })));

  return { reconciledAssignments: assignments.length, status: "updated" as const };
}
