import "server-only";
import { isPrismaUniqueConstraintError, prisma } from "@zoonk/db";
import { safeAsync } from "@zoonk/utils/error";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * The vocabulary is free-form, so near-identical names would otherwise become
 * twin segments and an assignment to one would silently miss the people
 * carrying the other: `Zona: Levante` and `zona:levante` must be one tag.
 */
function normalizeTagName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/\s*:\s*/gu, ":");
}

/** Adds one segment to an organization's vocabulary. */
export async function createMemberTag({
  name,
  organizationId,
}: {
  name: string;
  organizationId: string;
}) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { member: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  const normalizedName = normalizeTagName(name);

  if (!normalizedName) {
    return { status: "invalidName" as const };
  }

  const { data: tag, error } = await safeAsync(() =>
    prisma.memberTag.create({ data: { name: normalizedName, organizationId } }),
  );

  if (isPrismaUniqueConstraintError(error)) {
    return { status: "duplicate" as const };
  }

  if (error) {
    throw error;
  }

  return { status: "created" as const, tag };
}
