"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { PlusIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { useActionState } from "react";
import { type CreateMemberTagState, createMemberTagAction } from "./_actions/create-member-tag";

export function CreateTagForm({ organizationId }: { organizationId: string }) {
  const t = useExtracted();

  const [state, formAction] = useActionState(createMemberTagAction, {
    status: "idle",
    submissionId: 0,
  } satisfies CreateMemberTagState);

  const error = {
    created: null,
    duplicate: t("That segment already exists."),
    error: t("Could not create the segment."),
    idle: null,
    invalidName: t("Enter a name for the segment."),
  }[state.status];

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="organizationId" type="hidden" value={organizationId} />

      <Field>
        <FieldContent>
          <FieldLabel htmlFor="new-segment">{t("New segment")}</FieldLabel>

          <div className="flex gap-2">
            <Input id="new-segment" name="name" placeholder="zona:levante" required />
            <SubmitButton icon={<PlusIcon />}>{t("Add segment")}</SubmitButton>
          </div>

          <FieldDescription>
            {t("Use a prefix to group segments, such as zona:, funcio: or linia:.")}
          </FieldDescription>
        </FieldContent>
      </Field>

      {error && <FieldError>{error}</FieldError>}
    </form>
  );
}
