"use server";

import { createMemberTag } from "@zoonk/core/organizations/create-member-tag";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type CreateMemberTagState = {
  status: "idle" | "created" | "duplicate" | "invalidName" | "error";
  submissionId: number;
};

/**
 * Reports an outcome for the form to translate: the locale of the submitting
 * page cannot be resolved inside a Server Action.
 */
export async function createMemberTagAction(
  previousState: CreateMemberTagState,
  formData: FormData,
): Promise<CreateMemberTagState> {
  const submissionId = previousState.submissionId + 1;
  const organizationId = parseFormField(formData, "organizationId");
  const name = parseFormField(formData, "name") ?? "";

  if (!isUuid(organizationId)) {
    return { status: "error", submissionId };
  }

  const result = await createMemberTag({ name, organizationId });

  if (result.status === "duplicate" || result.status === "invalidName") {
    return { status: result.status, submissionId };
  }

  if (result.status !== "created") {
    return { status: "error", submissionId };
  }

  revalidatePath("/[lang]/org/[organizationSlug]", "page");

  return { status: "created", submissionId };
}
