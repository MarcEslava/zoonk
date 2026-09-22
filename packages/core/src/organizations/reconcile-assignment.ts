import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

type ExpectedRecipient = { matchedTagId: string | null; memberId: string; userId: string };

type OpenPeriod = { id: string; memberId: string | null };

/**
 * Someone named directly stays required for as long as they belong to the
 * organization, because the request was about them rather than about a segment
 * they might move out of.
 */
function toExpectedRecipients({
  directMembers,
  taggedLinks,
}: {
  directMembers: { id: string; userId: string }[];
  taggedLinks: { member: { userId: string }; memberId: string; tagId: string }[];
}): Map<string, ExpectedRecipient> {
  const expected = new Map<string, ExpectedRecipient>();

  for (const member of directMembers) {
    expected.set(member.id, { matchedTagId: null, memberId: member.id, userId: member.userId });
  }

  for (const link of taggedLinks) {
    if (!expected.has(link.memberId)) {
      expected.set(link.memberId, {
        matchedTagId: link.tagId,
        memberId: link.memberId,
        userId: link.member.userId,
      });
    }
  }

  return expected;
}

/**
 * A period whose member left the organization is stale too: `memberId` clears
 * on removal while the row keeps the user, so a null member means the person is
 * no longer part of the team the assignment describes.
 */
function getStalePeriodIds({
  expected,
  openPeriods,
}: {
  expected: Map<string, ExpectedRecipient>;
  openPeriods: OpenPeriod[];
}): string[] {
  return openPeriods
    .filter((period) => period.memberId === null || !expected.has(period.memberId))
    .map((period) => period.id);
}

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

  const memberIds = assignment.targets.flatMap((target) => target.memberId ?? []);
  const tagIds = assignment.targets.flatMap((target) => target.tagId ?? []);

  const [directMembers, taggedLinks, openPeriods] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, userId: true },
      where: { id: { in: memberIds }, organizationId: assignment.organizationId },
    }),
    prisma.memberTagLink.findMany({
      select: { member: { select: { userId: true } }, memberId: true, tagId: true },
      where: { member: { organizationId: assignment.organizationId }, tagId: { in: tagIds } },
    }),
    prisma.assignmentRecipient.findMany({
      select: { id: true, memberId: true },
      where: { assignmentId, removedAt: null },
    }),
  ]);

  const expected = toExpectedRecipients({ directMembers, taggedLinks });
  const openMemberIds = new Set(openPeriods.flatMap((period) => period.memberId ?? []));

  const missing = [...expected.values()].filter(
    (recipient) => !openMemberIds.has(recipient.memberId),
  );

  const staleIds = getStalePeriodIds({ expected, openPeriods });

  if (missing.length === 0 && staleIds.length === 0) {
    return { closed: 0, opened: 0, status: "reconciled" as const };
  }

  await prisma.$transaction(async (transaction) => {
    if (missing.length > 0) {
      await transaction.assignmentRecipient.createMany({
        data: missing.map((recipient) => ({ ...recipient, assignmentId })),
      });
    }

    if (staleIds.length > 0) {
      await transaction.assignmentRecipient.updateMany({
        data: { removedAt: new Date() },
        where: { id: { in: staleIds } },
      });
    }
  });

  return { closed: staleIds.length, opened: missing.length, status: "reconciled" as const };
}
