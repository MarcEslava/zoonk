"use client";

import { type MemberTag } from "@zoonk/db";
import { Checkbox } from "@zoonk/ui/components/checkbox";
import { FieldDynamicDescription, FieldError, FieldLabel } from "@zoonk/ui/components/field";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { useExtracted } from "next-intl";
import { useActionState } from "react";
import { type UpdateMemberTagsState, updateMemberTagsAction } from "./_actions/update-member-tags";

/**
 * Segments are replaced as a whole set, so every tag renders as a checkbox and
 * the unticked ones are what removes a person from a segment.
 */
export function MemberTagsForm({
  memberId,
  memberTagIds,
  organizationSlug,
  tags,
}: {
  memberId: string;
  memberTagIds: string[];
  organizationSlug: string;
  tags: MemberTag[];
}) {
  const t = useExtracted();

  const [state, formAction] = useActionState(updateMemberTagsAction, {
    error: null,
    status: "idle",
    submissionId: 0,
  } satisfies UpdateMemberTagsState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="memberId" type="hidden" value={memberId} />
      <input name="organizationSlug" type="hidden" value={organizationSlug} />

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {tags.map((tag) => (
          <FieldLabel className="flex items-center gap-2 font-normal" key={tag.id}>
            <Checkbox defaultChecked={memberTagIds.includes(tag.id)} name="tagIds" value={tag.id} />
            {tag.name}
          </FieldLabel>
        ))}
      </div>

      <div className="min-h-5">
        <FieldDynamicDescription
          key={state.submissionId}
          successMessage={state.status === "success" ? t("Segments saved.") : null}
        />
        {state.status === "error" && <FieldError>{state.error}</FieldError>}
      </div>

      <SubmitButton className="self-start">{t("Save segments")}</SubmitButton>
    </form>
  );
}
