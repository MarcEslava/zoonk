"use server";

import { setMemberTags } from "@zoonk/core/organizations/set-member-tags";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { getExtracted } from "next-intl/server";
import { revalidatePath } from "next/cache";

export type UpdateMemberTagsState = {
  error: string | null;
  status: "idle" | "error" | "success";
  submissionId: number;
};

/** Checkboxes only submit what is ticked, so an empty set clears every segment. */
function parseTagIds(formData: FormData): string[] {
  return formData
    .getAll("tagIds")
    .filter((value) => typeof value === "string")
    .filter((value) => isUuid(value));
}

export async function updateMemberTagsAction(
  previousState: UpdateMemberTagsState,
  formData: FormData,
): Promise<UpdateMemberTagsState> {
  const t = await getExtracted();
  const submissionId = previousState.submissionId + 1;
  const memberId = parseFormField(formData, "memberId");

  if (!isUuid(memberId)) {
    return { error: t("Could not save the segments."), status: "error", submissionId };
  }

  const result = await setMemberTags({ memberId, tagIds: parseTagIds(formData) });

  if (result.status !== "updated") {
    return { error: t("Could not save the segments."), status: "error", submissionId };
  }

  /** Every locale renders the same team, so the whole route is revalidated. */
  revalidatePath("/[lang]/org/[organizationSlug]", "page");

  return { error: null, status: "success", submissionId };
}
