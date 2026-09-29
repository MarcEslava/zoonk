import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Lists one organization's team with the segments each person carries, for the
 * screen that moves people between segments.
 *
 * Returns the access outcome rather than an empty list when the caller may not
 * see the team, so a delivery app can tell "no members" apart from "not your
 * organization" and a missing session apart from a missing permission.
 */
export async function listOrganizationMembers({ organizationId }: { organizationId: string }) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { member: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const members = await prisma.member.findMany({
    include: { tags: { include: { tag: true } }, user: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    where: { organizationId },
  });

  return {
    members: members.map((member) => ({
      id: member.id,
      name: member.user.name,
      role: member.role,
      tags: member.tags.map((link) => link.tag),
    })),
    status: "ready" as const,
  };
}
