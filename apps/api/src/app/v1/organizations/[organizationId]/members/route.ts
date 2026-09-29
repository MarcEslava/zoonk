import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError, toOrganizationMember } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { listOrganizationMembers } from "@zoonk/core/organizations/list-members";
import { NextResponse } from "next/server";

/** Lists an organization's team with the segments each person carries. */
async function getOrganizationMembers(
  _request: Request,
  context: RouteContext<"/v1/organizations/[organizationId]/members">,
) {
  const path = parsePathParams({
    params: await context.params,
    schema: organizationPathParamsSchema,
  });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await listOrganizationMembers(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({ data: result.members.map((member) => toOrganizationMember(member)) });
}

export const GET = withApiErrorBoundary(getOrganizationMembers);
