"use server";

import { approveLesson } from "@zoonk/core/lesson-reviews/approve-lesson";
import { discardStepDraft } from "@zoonk/core/lesson-reviews/discard-step-draft";
import { saveStepDraft } from "@zoonk/core/lesson-reviews/save-step-draft";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type StepDraftState = {
  status: "idle" | "saved" | "discarded" | "invalidContent" | "error";
  submissionId: number;
};

export type ApproveLessonState = {
  status: "idle" | "approved" | "ownChanges" | "nothingToApprove" | "error";
  submissionId: number;
};

/** The editor sends the whole step as JSON; core validates every field of it. */
function parseEdit(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** A lesson's review page and its course outline both show draft state. */
function revalidateReview() {
  revalidatePath("/[lang]/org/[organizationSlug]/lessons/[lessonId]", "page");
  revalidatePath("/[lang]/org/[organizationSlug]/courses/[courseId]", "page");
}

/**
 * Save and discard share one form: the pressed button's `intent` decides which.
 * Outcomes are returned for the form to translate, since a Server Action cannot
 * resolve the submitting page's locale.
 */
export async function stepDraftAction(
  previousState: StepDraftState,
  formData: FormData,
): Promise<StepDraftState> {
  const submissionId = previousState.submissionId + 1;
  const stepId = parseFormField(formData, "stepId");

  if (!isUuid(stepId)) {
    return { status: "error", submissionId };
  }

  if (parseFormField(formData, "intent") === "discard") {
    const result = await discardStepDraft({ stepId });

    if (result.status !== "discarded") {
      return { status: "error", submissionId };
    }

    revalidateReview();
    return { status: "discarded", submissionId };
  }

  const result = await saveStepDraft({ edit: parseEdit(parseFormField(formData, "edit")), stepId });

  if (result.status === "invalidContent") {
    return { status: "invalidContent", submissionId };
  }

  if (result.status !== "saved") {
    return { status: "error", submissionId };
  }

  revalidateReview();
  return { status: "saved", submissionId };
}

export async function approveLessonAction(
  previousState: ApproveLessonState,
  formData: FormData,
): Promise<ApproveLessonState> {
  const submissionId = previousState.submissionId + 1;
  const lessonId = parseFormField(formData, "lessonId");

  if (!isUuid(lessonId)) {
    return { status: "error", submissionId };
  }

  const result = await approveLesson({ lessonId });

  if (result.status === "ownChanges" || result.status === "nothingToApprove") {
    return { status: result.status, submissionId };
  }

  if (result.status !== "approved") {
    return { status: "error", submissionId };
  }

  revalidateReview();
  return { status: "approved", submissionId };
}
