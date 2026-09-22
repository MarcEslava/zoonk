"use client";

import {
  AdminEditForm,
  AdminEditFormActions,
  AdminEditFormFeedback,
} from "@/components/admin-edit-form";
import { type MultipleChoiceStepContent } from "@zoonk/core/steps/contract/content";
import { Button, buttonVariants } from "@zoonk/ui/components/button";
import { Checkbox } from "@zoonk/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { Textarea } from "@zoonk/ui/components/textarea";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  type UpdateStepContentState,
  updateStepContentAction,
} from "./_actions/update-step-content";

type Option = MultipleChoiceStepContent["options"][number];

const EMPTY_OPTION: Omit<Option, "id"> = { feedback: "", isCorrect: false, text: "" };

/**
 * Rows are keyed by a local row id rather than the array index so removing a
 * row does not make React reuse the inputs of the row that took its place.
 */
type Row = Option & { rowId: string };

function toRows(options: Option[]): Row[] {
  return options.map((option) => ({ ...option, rowId: option.id || crypto.randomUUID() }));
}

/** One editable option. Extracted so the form keeps a readable nesting depth. */
function OptionRow({
  index,
  onRemove,
  row,
}: {
  index: number;
  onRemove: (rowId: string) => void;
  row: Row;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <input name="optionId" type="hidden" value={row.id} />

      <div className="flex items-start gap-2">
        <Input
          aria-label={`Option ${index + 1} text`}
          defaultValue={row.text}
          name="optionText"
          required
        />
        <Button
          aria-label={`Remove option ${index + 1}`}
          onClick={() => onRemove(row.rowId)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2Icon />
        </Button>
      </div>

      <Input
        aria-label={`Option ${index + 1} feedback`}
        defaultValue={row.feedback}
        name="optionFeedback"
        placeholder="Feedback"
      />

      <FieldLabel className="flex items-center gap-2 font-normal">
        <Checkbox defaultChecked={row.isCorrect} name={`optionCorrect-${index}`} />
        Correct answer
      </FieldLabel>
    </div>
  );
}

export function MultipleChoiceForm({
  content,
  lessonId,
  stepId,
}: {
  content: MultipleChoiceStepContent;
  lessonId: string;
  stepId: string;
}) {
  const [state, formAction] = useActionState(updateStepContentAction, {
    error: null,
    status: "idle",
    submissionId: 0,
  } satisfies UpdateStepContentState);

  const [rows, setRows] = useState<Row[]>(() => toRows(content.options));

  const removeRow = (rowId: string) =>
    setRows((current) => current.filter((candidate) => candidate.rowId !== rowId));

  return (
    <AdminEditForm action={formAction}>
      <input name="id" type="hidden" value={stepId} />

      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="question">Question</FieldLabel>
            <Input defaultValue={content.question ?? ""} id="question" name="question" />
            <FieldDescription>The prompt shown above the options.</FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel htmlFor="context">Context</FieldLabel>
            <Textarea defaultValue={content.context ?? ""} id="context" name="context" rows={3} />
            <FieldDescription>
              Optional passage, case, or data the question refers to.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>Options</FieldLegend>
        <FieldDescription>
          Tick every option that counts as correct. Feedback is shown after the learner answers.
        </FieldDescription>

        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <OptionRow index={index} key={row.rowId} onRemove={removeRow} row={row} />
          ))}
        </div>

        <Button
          className="self-start"
          onClick={() =>
            setRows([...rows, { ...EMPTY_OPTION, id: "", rowId: crypto.randomUUID() }])
          }
          type="button"
          variant="outline"
        >
          <PlusIcon />
          Add option
        </Button>
      </FieldSet>

      <AdminEditFormFeedback
        error={state.status === "error" ? state.error : null}
        submissionId={state.submissionId}
        successMessage={state.status === "success" ? "Step updated successfully." : null}
      />

      <AdminEditFormActions>
        <Link className={buttonVariants({ variant: "outline" })} href={`/lessons/${lessonId}`}>
          Cancel
        </Link>
        <SubmitButton icon={<CheckIcon />}>Save changes</SubmitButton>
      </AdminEditFormActions>
    </AdminEditForm>
  );
}
