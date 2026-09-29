import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { parseBody } from "@/lib/body-parser";
import { createAssignmentRequestSchema } from "@/lib/openapi/schemas/organizations";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError, toOrganizationAssignment } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { createAssignment } from "@zoonk/core/organizations/create-assignment";
import { listOrganizationAssignments } from "@zoonk/core/organizations/list-assignments";
import { type NextRequest, NextResponse } from "next/server";

type AssignmentsRouteContext = RouteContext<"/v1/organizations/[organizationId]/assignments">;

/** Lists what an organization currently requires and how many people it reaches. */
async function getOrganizationAssignments(_request: Request, context: AssignmentsRouteContext) {
  const path = parsePathParams({
    params: await context.params,
    schema: organizationPathParamsSchema,
  });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await listOrganizationAssignments(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({
    data: result.assignments.map((assignment) => toOrganizationAssignment(assignment)),
  });
}

/** Requires one course from members chosen directly or through their segments. */
async function postOrganizationAssignment(request: NextRequest, context: AssignmentsRouteContext) {
  const [body, path] = await Promise.all([
    parseBody(request, createAssignmentRequestSchema),
    context.params.then((params) =>
      parsePathParams({ params, schema: organizationPathParamsSchema }),
    ),
  ]);

  if (!path.success) {
    return errors.validation(path.error);
  }

  if (!body.success) {
    return errors.validation(body.error);
  }

  const { courseId, dueAt, memberIds, minDailySeconds, tagIds } = body.data;

  const result = await createAssignment({
    courseId,
    dueAt: dueAt ? new Date(dueAt) : undefined,
    minDailySeconds,
    organizationId: path.data.organizationId,
    targets: { memberIds, tagIds },
  });

  if (result.status === "noTargets") {
    return errors.badRequest("Choose at least one member or tag");
  }

  if (result.status === "invalidTargets") {
    return errors.unprocessableEntity("Every member and tag must belong to this organization");
  }

  if (result.status === "courseNotAvailable") {
    return errors.unprocessableEntity("The course is not available to this organization");
  }

  if (result.status !== "created") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json(
    { id: result.assignment.id, recipientCount: result.recipientCount },
    { status: 201 },
  );
}

export const GET = withApiErrorBoundary(getOrganizationAssignments);
export const POST = withApiErrorBoundary(postOrganizationAssignment);
