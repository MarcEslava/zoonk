"use server";

import { setMemberTags } from "@zoonk/core/organizations/set-member-tags";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type UpdateMemberTagsState = { status: "idle" | "error" | "success"; submissionId: number };

/** Checkboxes only submit what is ticked, so an empty set clears every segment. */
function parseTagIds(formData: FormData): string[] {
  return formData
    .getAll("tagIds")
    .filter((value) => typeof value === "string")
    .filter((value) => isUuid(value));
}

/**
 * Reports an outcome rather than a message: a Server Action runs outside a
 * route, where the locale of the page that submitted it cannot be resolved, so
 * the form that owns this copy translates it.
 */
export async function updateMemberTagsAction(
  previousState: UpdateMemberTagsState,
  formData: FormData,
): Promise<UpdateMemberTagsState> {
  const submissionId = previousState.submissionId + 1;
  const memberId = parseFormField(formData, "memberId");

  if (!isUuid(memberId)) {
    return { status: "error", submissionId };
  }

  const result = await setMemberTags({ memberId, tagIds: parseTagIds(formData) });

  if (result.status !== "updated") {
    return { status: "error", submissionId };
  }

  /** Every locale renders the same team, so the whole route is revalidated. */
  revalidatePath("/[lang]/org/[organizationSlug]", "page");

  return { status: "success", submissionId };
}
