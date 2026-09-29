import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { toCurrentUserAssignments } from "@/lib/organization-responses";
import { getCurrentUserAssignments } from "@zoonk/core/organizations/list-current-user-assignments";
import { NextResponse } from "next/server";

/** Lists the courses the authenticated learner's organizations currently require. */
async function listCurrentUserAssignments() {
  const resource = await getCurrentUserAssignments();

  if (!resource) {
    return errors.unauthorized();
  }

  return NextResponse.json({ data: toCurrentUserAssignments(resource.assignments) });
}

export const GET = withApiErrorBoundary(listCurrentUserAssignments);
