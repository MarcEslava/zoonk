import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError, toOrganizationCourse } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { listAssignableCourses } from "@zoonk/core/organizations/list-assignable-courses";
import { NextResponse } from "next/server";

/** Lists the organization's own published courses its managers may assign. */
async function getAssignableCourses(
  _request: Request,
  context: RouteContext<"/v1/organizations/[organizationId]/assignable-courses">,
) {
  const path = parsePathParams({
    params: await context.params,
    schema: organizationPathParamsSchema,
  });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await listAssignableCourses(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({ data: result.courses.map((course) => toOrganizationCourse(course)) });
}

export const GET = withApiErrorBoundary(getAssignableCourses);
