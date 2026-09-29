import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { parseBody } from "@/lib/body-parser";
import { createMemberTagRequestSchema } from "@/lib/openapi/schemas/organizations";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError, toMemberTag } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { createMemberTag } from "@zoonk/core/organizations/create-member-tag";
import { listOrganizationTags } from "@zoonk/core/organizations/list-tags";
import { type NextRequest, NextResponse } from "next/server";

type TagsRouteContext = RouteContext<"/v1/organizations/[organizationId]/tags">;

/** Lists the segment vocabulary an organization owns. */
async function getOrganizationTags(_request: Request, context: TagsRouteContext) {
  const path = parsePathParams({
    params: await context.params,
    schema: organizationPathParamsSchema,
  });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await listOrganizationTags(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({ data: result.tags.map((tag) => toMemberTag(tag)) });
}

/** Adds one segment to an organization's vocabulary. */
async function postOrganizationTag(request: NextRequest, context: TagsRouteContext) {
  const [body, path] = await Promise.all([
    parseBody(request, createMemberTagRequestSchema),
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

  const result = await createMemberTag({ ...body.data, ...path.data });

  if (result.status === "invalidName") {
    return errors.badRequest("Tag name is empty");
  }

  if (result.status === "duplicate") {
    return errors.conflict("A tag with this name already exists");
  }

  if (result.status !== "created") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json(toMemberTag(result.tag), { status: 201 });
}

export const GET = withApiErrorBoundary(getOrganizationTags);
export const POST = withApiErrorBoundary(postOrganizationTag);
