"use client";

import { type SortOrderStepContent } from "@zoonk/core/steps/contract/content";
import { useExtracted } from "next-intl";
import { StepEditorForm, TextField } from "./step-editor-form";
import { StringListField } from "./string-list-field";
import { useStepContent } from "./use-step-content";

export function SortOrderEditor({
  content,
  hasDraft,
  label,
  stepId,
}: {
  content: SortOrderStepContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useStepContent(content);

  return (
    <StepEditorForm
      edit={{ content: draft, kind: "sortOrder" }}
      hasDraft={hasDraft}
      label={label}
      stepId={stepId}
    >
      <TextField
        label={t("Question")}
        onChange={(question) => setDraft({ ...draft, question })}
        value={draft.question}
      />
      <StringListField
        description={t("List them in the correct order; learners see them shuffled.")}
        label={t("Items")}
        onChange={(items) => setDraft({ ...draft, items })}
        orderable
        values={draft.items}
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
