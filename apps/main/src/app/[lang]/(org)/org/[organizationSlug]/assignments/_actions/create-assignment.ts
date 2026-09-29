"use server";

import { createAssignment } from "@zoonk/core/organizations/create-assignment";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type CreateAssignmentState = {
  status: "idle" | "created" | "noTargets" | "courseNotAvailable" | "invalidDetails" | "error";
  submissionId: number;
};

const MAX_DAILY_MINUTES = 120;

function parseIds(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((value) => typeof value === "string")
    .filter((value) => isUuid(value));
}

/** A daily target outside a few minutes to two hours is a typo, not a plan. */
function parseDailySeconds(value: string | null): number | null {
  const minutes = Number(value);

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DAILY_MINUTES) {
    return null;
  }

  return minutes * 60;
}

/**
 * A deadline names a day, so it closes at the end of that day. UTC is used
 * deliberately: it errs a couple of hours late for Spain rather than early.
 */
function parseDueAt(value: string | null): Date | undefined | null {
  if (!value) {
    return undefined;
  }

  const dueAt = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
}

/**
 * Reports an outcome for the form to translate: the locale of the submitting
 * page cannot be resolved inside a Server Action.
 */
export async function createAssignmentAction(
  previousState: CreateAssignmentState,
  formData: FormData,
): Promise<CreateAssignmentState> {
  const submissionId = previousState.submissionId + 1;
  const organizationId = parseFormField(formData, "organizationId");
  const courseId = parseFormField(formData, "courseId");
  const minDailySeconds = parseDailySeconds(parseFormField(formData, "dailyMinutes"));
  const dueAt = parseDueAt(parseFormField(formData, "dueAt"));

  if (!isUuid(organizationId) || !isUuid(courseId) || minDailySeconds === null || dueAt === null) {
    return { status: "invalidDetails", submissionId };
  }

  const result = await createAssignment({
    courseId,
    dueAt,
    minDailySeconds,
    organizationId,
    targets: { memberIds: parseIds(formData, "memberIds"), tagIds: parseIds(formData, "tagIds") },
  });

  if (result.status === "noTargets" || result.status === "courseNotAvailable") {
    return { status: result.status, submissionId };
  }

  if (result.status !== "created") {
    return { status: "error", submissionId };
  }

  revalidatePath("/[lang]/org/[organizationSlug]/assignments", "page");

  return { status: "created", submissionId };
}
