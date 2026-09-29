import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { toCourseReview } from "@/lib/lesson-review-responses";
import { coursePathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import { getCourseReview } from "@zoonk/core/lesson-reviews/get-course-review";
import { NextResponse } from "next/server";

/** Outlines an organization course with how many corrections wait on each lesson. */
async function getCourseReviewRoute(
  _request: Request,
  context: RouteContext<"/v1/courses/[courseId]/review">,
) {
  const path = parsePathParams({ params: await context.params, schema: coursePathParamsSchema });

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await getCourseReview(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status, "Course not found");
  }

  return NextResponse.json(toCourseReview(result));
}

export const GET = withApiErrorBoundary(getCourseReviewRoute);
