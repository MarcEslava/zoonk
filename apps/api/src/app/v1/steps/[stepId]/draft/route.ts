import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { parseBody } from "@/lib/body-parser";
import { editedStepRequestSchema } from "@/lib/openapi/schemas/lesson-reviews";
import { stepPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { discardStepDraft } from "@zoonk/core/lesson-reviews/discard-step-draft";
import { saveStepDraft } from "@zoonk/core/lesson-reviews/save-step-draft";
import { type NextRequest, NextResponse } from "next/server";

type StepDraftRouteContext = RouteContext<"/v1/steps/[stepId]/draft">;

async function parseStepPath(context: StepDraftRouteContext) {
  return parsePathParams({ params: await context.params, schema: stepPathParamsSchema });
}

/** Saves a correction as a draft; the team keeps seeing the approved content. */
async function putStepDraft(request: NextRequest, context: StepDraftRouteContext) {
  const [body, path] = await Promise.all([
    parseBody(request, editedStepRequestSchema),
    parseStepPath(context),
  ]);

  if (!path.success) {
    return errors.validation(path.error);
  }

  if (!body.success) {
    return errors.validation(body.error);
  }

  const result = await saveStepDraft({ edit: body.data, stepId: path.data.stepId });

  if (result.status === "notEditable") {
    return errors.unprocessableEntity("This kind of step cannot be edited");
  }

  if (result.status === "invalidContent") {
    return errors.unprocessableEntity(
      "The step could not be played: check the kind, the correct answer, one answer per blank and empty texts",
    );
  }

  if (result.status !== "saved") {
    return organizationAccessError(result.status, "Step not found");
  }

  return new NextResponse(null, { status: 204 });
}

/** Drops a step's pending correction. Discarding a step without one succeeds. */
async function deleteStepDraft(_request: Request, context: StepDraftRouteContext) {
  const path = await parseStepPath(context);

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await discardStepDraft(path.data);

  if (result.status !== "discarded") {
    return organizationAccessError(result.status, "Step not found");
  }

  return new NextResponse(null, { status: 204 });
}

export const PUT = withApiErrorBoundary(putStepDraft);
export const DELETE = withApiErrorBoundary(deleteStepDraft);
