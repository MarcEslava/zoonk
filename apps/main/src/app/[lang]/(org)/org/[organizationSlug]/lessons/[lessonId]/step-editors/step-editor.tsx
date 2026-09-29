import {
  type EditedStepContent,
  editedStepContentSchema,
} from "@zoonk/core/lesson-reviews/contract";
import { getExtracted } from "next-intl/server";
import { FillBlankEditor } from "./fill-blank-editor";
import { MatchColumnsEditor } from "./match-columns-editor";
import { MultipleChoiceEditor } from "./multiple-choice-editor";
import { SortOrderEditor } from "./sort-order-editor";
import { StaticEditor } from "./static-editor";

type EditorProps = { hasDraft: boolean; label: string; stepId: string };

function getEditor(edit: EditedStepContent, props: EditorProps) {
  if (edit.kind === "multipleChoice") {
    return <MultipleChoiceEditor content={edit.content} {...props} />;
  }

  if (edit.kind === "fillBlank") {
    return <FillBlankEditor content={edit.content} {...props} />;
  }

  if (edit.kind === "matchColumns") {
    return <MatchColumnsEditor content={edit.content} {...props} />;
  }

  if (edit.kind === "sortOrder") {
    return <SortOrderEditor content={edit.content} {...props} />;
  }

  return edit.content.variant === "text" ? (
    <StaticEditor content={edit.content} {...props} />
  ) : null;
}

/**
 * Picks the editor for one step. The draft, when there is one, is what the
 * reviewer continues from. Content that does not match an editable contract is
 * shown as not editable rather than as a form that could not save it.
 */
export async function StepEditor({
  content,
  kind,
  ...props
}: EditorProps & { content: unknown; kind: string }) {
  const t = await getExtracted();
  const parsed = editedStepContentSchema.safeParse({ content, kind });
  const editor = parsed.success ? getEditor(parsed.data, props) : null;

  return (
    editor ?? (
      <p className="text-muted-foreground text-sm">
        {t("This kind of step cannot be edited here.")}
      </p>
    )
  );
}
