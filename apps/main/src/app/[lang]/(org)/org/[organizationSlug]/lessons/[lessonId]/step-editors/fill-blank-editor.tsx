"use client";

import { type FillBlankStepContent } from "@zoonk/core/steps/contract/content";
import { useExtracted } from "next-intl";
import { StepEditorForm, TextField, optionalText } from "./step-editor-form";
import { StringListField } from "./string-list-field";
import { useStepContent } from "./use-step-content";

export function FillBlankEditor({
  content,
  hasDraft,
  label,
  stepId,
}: {
  content: FillBlankStepContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useStepContent(content);

  return (
    <StepEditorForm
      edit={{ content: draft, kind: "fillBlank" }}
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
        label={t("Sentence")}
        multiline
        onChange={(template) => setDraft({ ...draft, template })}
        value={draft.template}
      />
      <p className="text-muted-foreground text-sm">
        {t("Write [BLANK] where each answer goes, in the same order as the answers.")}
      </p>

      <StringListField
        label={t("Answers")}
        onChange={(answers) => setDraft({ ...draft, answers })}
        orderable
        values={draft.answers}
      />
      <StringListField
        description={t("Wrong words offered next to the answers.")}
        label={t("Distractors")}
        onChange={(distractors) => setDraft({ ...draft, distractors })}
        values={draft.distractors}
      />
      <TextField
        label={t("Feedback")}
        multiline
        onChange={(feedback) => setDraft({ ...draft, feedback })}
        value={draft.feedback}
      />
    </StepEditorForm>
  );
}
