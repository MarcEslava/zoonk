import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Lists the segment vocabulary one organization owns. Returns null when the
 * caller may not manage its team, matching the member list it accompanies.
 */
export async function listOrganizationTags({ organizationId }: { organizationId: string }) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { member: ["update"] },
  });

  if (access.status !== "ready") {
    return null;
  }

  return prisma.memberTag.findMany({ orderBy: { name: "asc" }, where: { organizationId } });
}
