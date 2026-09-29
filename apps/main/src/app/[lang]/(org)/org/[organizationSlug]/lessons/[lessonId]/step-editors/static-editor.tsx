"use client";

import { type EditedStepContent } from "@zoonk/core/lesson-reviews/contract";
import { useExtracted } from "next-intl";
import { StepEditorForm, TextField } from "./step-editor-form";
import { useStepContent } from "./use-step-content";

type StaticTextContent = Extract<
  Extract<EditedStepContent, { kind: "static" }>["content"],
  { variant: "text" }
>;

/**
 * Only explanation text is edited here. Grammar examples belong to language
 * courses, which organizations do not review in this console.
 */
export function StaticEditor({
  content,
  hasDraft,
  label,
  stepId,
}: {
  content: StaticTextContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useStepContent(content);

  return (
    <StepEditorForm
      edit={{ content: draft, kind: "static" }}
      hasDraft={hasDraft}
      label={label}
      stepId={stepId}
    >
      <TextField
        label={t("Title")}
        onChange={(title) => setDraft({ ...draft, title })}
        value={draft.title}
      />
      <TextField
        label={t("Text")}
        multiline
        onChange={(text) => setDraft({ ...draft, text })}
        value={draft.text}
      />
    </StepEditorForm>
  );
}
