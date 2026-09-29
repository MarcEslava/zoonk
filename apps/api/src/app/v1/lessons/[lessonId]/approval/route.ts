import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { lessonPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { approveLesson } from "@zoonk/core/lesson-reviews/approve-lesson";
import { NextResponse } from "next/server";

/**
 * Approves a lesson so the team sees its corrections. Refused when nothing
 * waits for approval, or when the caller edited the lesson since its last
 * approval: a second person always reviews a change.
 */
async function approveLessonRoute(
  _request: Request,
  context: RouteContext<"/v1/lessons/[lessonId]/approval">,
) {
  const path = parsePathParams({ params: await context.params, schema: lessonPathParamsSchema });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await approveLesson(path.data);

  if (result.status === "ownChanges") {
    return errors.forbidden("You edited this lesson, so someone else has to approve it");
  }

  if (result.status === "nothingToApprove") {
    return errors.conflict("Nothing in this lesson is waiting for approval");
  }

  if (result.status !== "approved") {
    return organizationAccessError(result.status, "Lesson not found");
  }

  return NextResponse.json({ approvedDrafts: result.approvedDrafts });
}

export const POST = withApiErrorBoundary(approveLessonRoute);
