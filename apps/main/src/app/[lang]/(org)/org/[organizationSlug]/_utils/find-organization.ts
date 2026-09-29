import { listCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";

/**
 * The caller's own memberships already carry the organization, so resolving the
 * slug through them avoids a lookup that would confirm an organization exists
 * to someone who does not belong to it.
 */
export async function findOrganization(organizationSlug: string) {
  const memberships = await listCurrentUserOrganizations();
  return memberships.find((membership) => membership.organization.slug === organizationSlug);
}
