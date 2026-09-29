"use client";

import { type EditedStepContent } from "@zoonk/core/lesson-reviews/contract";
import { Button } from "@zoonk/ui/components/button";
import { Field, FieldDynamicDescription, FieldError, FieldLabel } from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { Textarea } from "@zoonk/ui/components/textarea";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { useExtracted } from "next-intl";
import { useActionState, useId } from "react";
import { type StepDraftState, stepDraftAction } from "../_actions/review-actions";

/** Optional texts are left out when empty rather than stored as blank strings. */
export function optionalText(value: string): string | undefined {
  return value.trim() === "" ? undefined : value;
}

/** A labelled single-line or multi-line text input for one field of a step. */
export function TextField({
  label,
  multiline = false,
  onChange,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          value={value}
        />
      ) : (
        <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
      )}
    </Field>
  );
}

/**
 * Wraps one step's fields. The whole edited step travels as JSON because core
 * validates it against the same contract the player reads; the form only has
 * to describe what the reviewer typed.
 */
export function StepEditorForm({
  children,
  edit,
  hasDraft,
  label,
  stepId,
}: {
  children: React.ReactNode;
  edit: EditedStepContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();

  const [state, formAction] = useActionState(stepDraftAction, {
    status: "idle",
    submissionId: 0,
  } satisfies StepDraftState);

  return (
    <form action={formAction} aria-label={label} className="flex flex-col gap-4">
      <input name="stepId" type="hidden" value={stepId} />
      <input name="edit" type="hidden" value={JSON.stringify(edit)} />

      {children}

      <div className="min-h-5">
        <FieldDynamicDescription
          key={state.submissionId}
          successMessage={
            state.status === "saved"
              ? t("Draft saved. Your team keeps seeing the approved version.")
              : null
          }
        />
        {state.status === "invalidContent" && (
          <FieldError>
            {t("Fill in every field, mark a correct answer and add one answer per blank.")}
          </FieldError>
        )}
        {state.status === "error" && <FieldError>{t("Could not save the draft.")}</FieldError>}
      </div>

      <div className="flex gap-2">
        <SubmitButton name="intent" value="save">
          {t("Save draft")}
        </SubmitButton>
        {hasDraft && (
          <Button name="intent" type="submit" value="discard" variant="outline">
            {t("Discard draft")}
          </Button>
        )}
      </div>
    </form>
  );
}
