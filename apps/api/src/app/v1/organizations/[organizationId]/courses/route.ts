import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { listReviewCourses } from "@zoonk/core/lesson-reviews/list-review-courses";
import { NextResponse } from "next/server";

/** Lists an organization's own courses, drafts included, for review. */
async function getOrganizationCourses(
  _request: Request,
  context: RouteContext<"/v1/organizations/[organizationId]/courses">,
) {
  const path = parsePathParams({
    params: await context.params,
    schema: organizationPathParamsSchema,
  });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await listReviewCourses(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({ data: result.courses });
}

export const GET = withApiErrorBoundary(getOrganizationCourses);
