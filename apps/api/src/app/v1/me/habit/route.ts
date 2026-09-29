import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { getCurrentUserHabitResource } from "@zoonk/core/progress/get-current-user-habit";
import { NextResponse } from "next/server";

/**
 * Returns the authenticated learner's own weekly habit. Only the learner can
 * read it: no organization endpoint exposes another person's habit.
 */
async function getCurrentUserHabit() {
  const resource = await getCurrentUserHabitResource();

  if (!resource) {
    return errors.unauthorized();
  }

  return NextResponse.json(resource);
}

export const GET = withApiErrorBoundary(getCurrentUserHabit);
