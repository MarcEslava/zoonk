"use client";

import { type MatchColumnsStepContent } from "@zoonk/core/steps/contract/content";
import { Button } from "@zoonk/ui/components/button";
import { FieldLegend, FieldSet } from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useExtracted } from "next-intl";
import { StepEditorForm, TextField, optionalText } from "./step-editor-form";
import { useStepContent } from "./use-step-content";

type Pair = MatchColumnsStepContent["pairs"][number];

export function MatchColumnsEditor({
  content,
  hasDraft,
  label,
  stepId,
}: {
  content: MatchColumnsStepContent;
  hasDraft: boolean;
  label: string;
  stepId: string;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useStepContent(content);
  const setPairs = (pairs: Pair[]) => setDraft({ ...draft, pairs });

  const updatePair = (index: number, pair: Pair) =>
    setPairs(draft.pairs.map((current, at) => (at === index ? pair : current)));

  return (
    <StepEditorForm
      edit={{ content: draft, kind: "matchColumns" }}
      hasDraft={hasDraft}
      label={label}
      stepId={stepId}
    >
      <TextField
        label={t("Question")}
        onChange={(question) => setDraft({ ...draft, question: optionalText(question) })}
        value={draft.question ?? ""}
      />

      <FieldSet>
        <FieldLegend variant="label">{t("Pairs")}</FieldLegend>

        <div className="flex flex-col gap-2">
          {draft.pairs.map((pair, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- Pairs carry no ids; their position is their identity while editing.
            <div className="flex items-center gap-2" key={index}>
              <Input
                aria-label={t("Left {number, number}", { number: index + 1 })}
                onChange={(event) => updatePair(index, { ...pair, left: event.target.value })}
                value={pair.left}
              />
              <Input
                aria-label={t("Right {number, number}", { number: index + 1 })}
                onChange={(event) => updatePair(index, { ...pair, right: event.target.value })}
                value={pair.right}
              />
              <Button
                aria-label={t("Remove pair {number, number}", { number: index + 1 })}
                onClick={() => setPairs(draft.pairs.filter((_, at) => at !== index))}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>

        <Button
          className="self-start"
          onClick={() => setPairs([...draft.pairs, { left: "", right: "" }])}
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon />
          {t("Add pair")}
        </Button>
      </FieldSet>
    </StepEditorForm>
  );
}
