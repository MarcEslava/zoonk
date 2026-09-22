"use server";

import { assertAdmin } from "@/lib/admin-guard";
import {
  type MultipleChoiceStepContent,
  parseStepContent,
} from "@zoonk/core/steps/contract/content";
import { prisma } from "@zoonk/db";
import { safeAsync } from "@zoonk/utils/error";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type UpdateStepContentState = {
  error: string | null;
  status: "idle" | "error" | "success";
  submissionId: number;
};

function readTrimmedList(formData: FormData, field: string): string[] {
  return formData.getAll(field).map((value) => (typeof value === "string" ? value.trim() : ""));
}

/**
 * Option rows submit as parallel lists, so an option keeps its saved id while
 * a row the admin just added gets one here instead of on the client, where a
 * re-render could hand two rows the same value.
 */
function buildOptions(formData: FormData): MultipleChoiceStepContent["options"] {
  const ids = readTrimmedList(formData, "optionId");
  const texts = readTrimmedList(formData, "optionText");
  const feedbacks = readTrimmedList(formData, "optionFeedback");

  return texts
    .map((text, index) => ({
      feedback: feedbacks[index] ?? "",
      id: ids[index] || crypto.randomUUID(),
      isCorrect: formData.get(`optionCorrect-${index}`) !== null,
      text,
    }))
    .filter((option) => option.text !== "");
}

/**
 * Admins edit generated exercises, so the saved shape is validated against the
 * same contract the player reads rather than trusting the submitted form.
 */
export async function updateStepContentAction(
  previousState: UpdateStepContentState,
  formData: FormData,
): Promise<UpdateStepContentState> {
  await assertAdmin();

  const submissionId = previousState.submissionId + 1;
  const id = parseFormField(formData, "id");
  const question = parseFormField(formData, "question");
  const context = parseFormField(formData, "context");
  const options = buildOptions(formData);

  if (!isUuid(id)) {
    return { error: "This step id is not valid.", status: "error", submissionId };
  }

  if (options.length === 0) {
    return { error: "Add at least one option with text.", status: "error", submissionId };
  }

  if (!options.some((option) => option.isCorrect)) {
    return { error: "Mark at least one option as correct.", status: "error", submissionId };
  }

  const { data: content, error: contentError } = await safeAsync(() =>
    Promise.resolve(
      parseStepContent("multipleChoice", {
        ...(context && { context }),
        options,
        ...(question && { question }),
      }),
    ),
  );

  if (contentError) {
    return {
      error: "This content does not match the exercise contract.",
      status: "error",
      submissionId,
    };
  }

  const { error: updateError } = await safeAsync(() =>
    prisma.step.update({ data: { content }, where: { id, kind: "multipleChoice" } }),
  );

  if (updateError) {
    return { error: "Could not save this step. Please try again.", status: "error", submissionId };
  }

  revalidatePath(`/steps/${id}`);

  return { error: null, status: "success", submissionId };
}
