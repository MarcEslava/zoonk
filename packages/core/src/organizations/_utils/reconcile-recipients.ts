import "server-only";
import { prisma } from "@zoonk/db";

type AssignmentWithTargets = {
  id: string;
  organizationId: string;
  targets: { memberId: string | null; tagId: string | null }[];
};

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
 * This is the shared mechanism, without an authorization check: every caller
 * must be a public capability that already derived the acting member.
 */
export async function reconcileAssignmentRecipients({
  assignment,
}: {
  assignment: AssignmentWithTargets;
}) {
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
      where: { assignmentId: assignment.id, removedAt: null },
    }),
  ]);

  const expected = toExpectedRecipients({ directMembers, taggedLinks });
  const openMemberIds = new Set(openPeriods.flatMap((period) => period.memberId ?? []));

  const missing = [...expected.values()].filter(
    (recipient) => !openMemberIds.has(recipient.memberId),
  );

  const staleIds = getStalePeriodIds({ expected, openPeriods });

  if (missing.length === 0 && staleIds.length === 0) {
    return { closed: 0, opened: 0 };
  }

  await prisma.$transaction(async (transaction) => {
    if (missing.length > 0) {
      await transaction.assignmentRecipient.createMany({
        data: missing.map((recipient) => ({ ...recipient, assignmentId: assignment.id })),
      });
    }

    if (staleIds.length > 0) {
      await transaction.assignmentRecipient.updateMany({
        data: { removedAt: new Date() },
        where: { id: { in: staleIds } },
      });
    }
  });

  return { closed: staleIds.length, opened: missing.length };
}
