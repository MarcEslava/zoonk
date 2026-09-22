import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

type AssignmentTargets = { memberIds?: string[]; tagIds?: string[] };

type RecipientDraft = { matchedTagId: string | null; memberId: string; userId: string };

/**
 * An organization can require its own curriculum or anything already public,
 * but never another organization's private course.
 */
function getAssignableCourseWhere({
  courseId,
  organizationId,
}: {
  courseId: string;
  organizationId: string;
}) {
  return { OR: [{ organizationId }, { organization: { kind: "brand" } }], id: courseId };
}

/**
 * A member named directly keeps a null matched tag: the request was about that
 * person, so a tag they happen to carry should not be recorded as the reason.
 */
function mergeRecipients({
  directMembers,
  taggedMembers,
}: {
  directMembers: { id: string; userId: string }[];
  taggedMembers: { member: { userId: string }; memberId: string; tagId: string }[];
}): RecipientDraft[] {
  const directIds = new Set(directMembers.map((member) => member.id));

  const direct = directMembers.map((member) => ({
    matchedTagId: null,
    memberId: member.id,
    userId: member.userId,
  }));

  const tagged = taggedMembers
    .filter((link) => !directIds.has(link.memberId))
    .map((link) => ({
      matchedTagId: link.tagId,
      memberId: link.memberId,
      userId: link.member.userId,
    }));

  const firstByMember = new Map<string, RecipientDraft>();

  for (const recipient of [...direct, ...tagged]) {
    if (!firstByMember.has(recipient.memberId)) {
      firstByMember.set(recipient.memberId, recipient);
    }
  }

  return [...firstByMember.values()];
}

/**
 * Requires one course from part of an organization's team.
 *
 * Targets record what was asked for and recipients record who it reached, so a
 * later audit can show both. Resolving to nobody is a valid outcome rather than
 * an error: a tag with no members yet still describes a standing obligation
 * that reconciliation applies to whoever joins with it.
 */
export async function createAssignment({
  courseId,
  dueAt,
  minDailySeconds,
  organizationId,
  targets,
}: {
  courseId: string;
  dueAt?: Date;
  minDailySeconds?: number;
  organizationId: string;
  targets: AssignmentTargets;
}) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { assignment: ["create"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const memberIds = [...new Set(targets.memberIds)];
  const tagIds = [...new Set(targets.tagIds)];

  if (memberIds.length === 0 && tagIds.length === 0) {
    return { status: "noTargets" as const };
  }

  const [course, members, tags] = await Promise.all([
    prisma.course.findFirst({ where: getAssignableCourseWhere({ courseId, organizationId }) }),
    prisma.member.findMany({
      select: { id: true, userId: true },
      where: { id: { in: memberIds }, organizationId },
    }),
    prisma.memberTag.findMany({
      select: { id: true },
      where: { id: { in: tagIds }, organizationId },
    }),
  ]);

  if (!course) {
    return { status: "courseNotAvailable" as const };
  }

  if (members.length !== memberIds.length || tags.length !== tagIds.length) {
    return { status: "invalidTargets" as const };
  }

  const taggedLinks = await prisma.memberTagLink.findMany({
    select: { member: { select: { userId: true } }, memberId: true, tagId: true },
    where: { member: { organizationId }, tagId: { in: tagIds } },
  });

  const recipients = mergeRecipients({ directMembers: members, taggedMembers: taggedLinks });

  const assignment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.assignment.create({
      data: {
        courseId,
        createdById: access.membership.userId,
        ...(dueAt && { dueAt }),
        ...(minDailySeconds !== undefined && { minDailySeconds }),
        organizationId,
      },
    });

    await transaction.assignmentTarget.createMany({
      data: [
        ...memberIds.map((memberId) => ({ assignmentId: created.id, memberId })),
        ...tagIds.map((tagId) => ({ assignmentId: created.id, tagId })),
      ],
    });

    if (recipients.length > 0) {
      await transaction.assignmentRecipient.createMany({
        data: recipients.map((recipient) => ({ ...recipient, assignmentId: created.id })),
      });
    }

    return created;
  });

  return { assignment, recipientCount: recipients.length, status: "created" as const };
}
