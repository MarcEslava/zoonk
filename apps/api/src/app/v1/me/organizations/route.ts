import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { toCurrentUserOrganization } from "@/lib/organization-responses";
import { getCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";
import { NextResponse } from "next/server";

/** Lists the organizations the authenticated user belongs to, with their role. */
async function listCurrentUserOrganizations() {
  const resource = await getCurrentUserOrganizations();

  if (!resource) {
    return errors.unauthorized();
  }

  return NextResponse.json({
    data: resource.organizations.map((membership) => toCurrentUserOrganization(membership)),
  });
}

export const GET = withApiErrorBoundary(listCurrentUserOrganizations);
