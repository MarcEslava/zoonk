import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { parseBody } from "@/lib/body-parser";
import { setMemberTagsRequestSchema } from "@/lib/openapi/schemas/organizations";
import { organizationMemberPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { setMemberTags } from "@zoonk/core/organizations/set-member-tags";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Replaces one member's segments. The assignments that follow those segments
 * are reconciled before responding, so the change applies immediately.
 */
async function putMemberTags(
  request: NextRequest,
  context: RouteContext<"/v1/organization-members/[memberId]/tags">,
) {
  const [body, path] = await Promise.all([
    parseBody(request, setMemberTagsRequestSchema),
    context.params.then((params) =>
      parsePathParams({ params, schema: organizationMemberPathParamsSchema }),
    ),
  ]);

  if (!path.success) {
    return errors.validation(path.error);
  }

  if (!body.success) {
    return errors.validation(body.error);
  }

  const result = await setMemberTags({ ...body.data, ...path.data });

  if (result.status === "invalidTags") {
    return errors.unprocessableEntity("Every tag must belong to the member's organization");
  }

  if (result.status !== "updated") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json({ reconciledAssignments: result.reconciledAssignments });
}

export const PUT = withApiErrorBoundary(putMemberTags);
