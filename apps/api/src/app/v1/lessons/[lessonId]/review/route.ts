import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { toLessonReview } from "@/lib/lesson-review-responses";
import { lessonPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { getLessonReview } from "@zoonk/core/lesson-reviews/get-lesson-review";
import { NextResponse } from "next/server";

/** Returns a lesson's steps, the corrections waiting on them and its history. */
async function getLessonReviewRoute(
  _request: Request,
  context: RouteContext<"/v1/lessons/[lessonId]/review">,
) {
  const path = parsePathParams({ params: await context.params, schema: lessonPathParamsSchema });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await getLessonReview(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status, "Lesson not found");
  }

  return NextResponse.json(toLessonReview(result));
}

export const GET = withApiErrorBoundary(getLessonReviewRoute);
