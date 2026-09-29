import "server-only";
import { prisma } from "@zoonk/db";
import { getSession } from "../users/get-session";

/**
 * Lists the organizations the signed-in person belongs to, with the role that
 * decides what they may do inside each one.
 *
 * Uncached like every membership read: losing a role has to take effect on the
 * next request rather than when a cache entry expires.
 */
export async function listCurrentUserOrganizations() {
  const session = await getSession();

  if (!session) {
    return [];
  }

  const memberships = await prisma.member.findMany({
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
    where: { userId: session.user.id },
  });

  return memberships.map((membership) => ({
    memberId: membership.id,
    organization: membership.organization,
    role: membership.role,
  }));
}

/**
 * Wraps the membership list as a current-user resource so delivery adapters
 * can tell missing authentication apart from belonging to no organization.
 */
export async function getCurrentUserOrganizations() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return { organizations: await listCurrentUserOrganizations() };
}
