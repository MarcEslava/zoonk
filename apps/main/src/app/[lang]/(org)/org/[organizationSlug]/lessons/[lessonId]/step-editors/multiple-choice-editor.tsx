"use client";

import { type MultipleChoiceStepContent } from "@zoonk/core/steps/contract/content";
import { Button } from "@zoonk/ui/components/button";
import { Checkbox } from "@zoonk/ui/components/checkbox";
import { FieldLabel, FieldLegend, FieldSet } from "@zoonk/ui/components/field";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useExtracted } from "next-intl";
import { StepEditorForm, TextField, optionalText } from "./step-editor-form";
import { useStepContent } from "./use-step-content";

type Option = MultipleChoiceStepContent["options"][number];

function OptionFields({
  number,
  onChange,
  onRemove,
  option,
}: {
  number: number;
  onChange: (option: Option) => void;
  onRemove: () => void;
  option: Option;
}) {
  const t = useExtracted();

  return (
    <FieldSet className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <FieldLegend variant="label">{t("Option {number, number}", { number })}</FieldLegend>
        <Button
          aria-label={t("Remove option {number, number}", { number })}
          onClick={onRemove}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2Icon />
        </Button>
      </div>

      <TextField
        label={t("Answer")}
        onChange={(text) => onChange({ ...option, text })}
        value={option.text}
      />
      <TextField
        label={t("Feedback")}
        onChange={(feedback) => onChange({ ...option, feedback })}
        value={option.feedback}
      />

      <FieldLabel className="flex items-center gap-2 font-normal">
        <Checkbox
          checked={option.isCorrect}
          onCheckedChange={(isCorrect) => onChange({ ...option, isCorrect })}
        />
        {t("Correct answer")}
      </FieldLabel>
    </FieldSet>
  );
}

export function MultipleChoiceEditor({
  content,
  hasDraft,
  label,
  stepId,
}: {
  content: MultipleChoiceStepContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useStepContent(content);
  const setOptions = (options: Option[]) => setDraft({ ...draft, options });

  return (
    <StepEditorForm
      edit={{ content: draft, kind: "multipleChoice" }}
      hasDraft={hasDraft}
      label={label}
      stepId={stepId}
    >
      <TextField
        label={t("Question")}
        onChange={(question) => setDraft({ ...draft, question: optionalText(question) })}
        value={draft.question ?? ""}
      />
      <TextField
        label={t("Context")}
        multiline
        onChange={(context) => setDraft({ ...draft, context: optionalText(context) })}
        value={draft.context ?? ""}
      />

      {draft.options.map((option, index) => (
        <OptionFields
          key={option.id}
          number={index + 1}
          onChange={(next) =>
            setOptions(draft.options.map((current) => (current.id === option.id ? next : current)))
          }
          onRemove={() => setOptions(draft.options.filter((current) => current.id !== option.id))}
          option={option}
        />
      ))}

      <Button
        className="self-start"
        onClick={() =>
          setOptions([
            ...draft.options,
            { feedback: "", id: crypto.randomUUID(), isCorrect: false, text: "" },
          ])
        }
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {t("Add option")}
      </Button>
    </StepEditorForm>
  );
}
