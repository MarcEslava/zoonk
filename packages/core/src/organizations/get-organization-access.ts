import "server-only";
import { admin, member, owner } from "@zoonk/auth/permissions";
import { prisma } from "@zoonk/db";
import { getSession } from "../users/get-session";

const ROLES = { admin, member, owner };

type OrganizationRole = keyof typeof ROLES;

/** Member.role is a free-form column, so an unrecognized value fails closed. */
function isOrganizationRole(value: string): value is OrganizationRole {
  return Object.hasOwn(ROLES, value);
}

/**
 * Applies one organization's role permissions before a delivery app reads or
 * changes anything that belongs to that organization.
 *
 * Membership is an authorization precondition, so this stays uncached:
 * revoking someone's access has to take effect on their next request instead
 * of when a cache entry happens to expire.
 *
 * A non-member gets `notFound` rather than `forbidden` because confirming that
 * an organization exists already tells one customer something about another.
 */
export async function getOrganizationAccess({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: Parameters<typeof owner.authorize>[0];
}) {
  const session = await getSession();

  if (!session) {
    return { status: "unauthorized" as const };
  }

  const membership = await prisma.member.findFirst({
    where: { organizationId, userId: session.user.id },
  });

  if (!membership) {
    return { status: "notFound" as const };
  }

  if (!isOrganizationRole(membership.role)) {
    return { status: "forbidden" as const };
  }

  if (!ROLES[membership.role].authorize(permissions).success) {
    return { status: "forbidden" as const };
  }

  return { membership, status: "ready" as const };
}
