import { isJsonObject } from "@zoonk/utils/json";
import { type EditedStepContent } from "../contract";

const FILL_BLANK_MARKER = "[BLANK]";
const MIN_ORDERED_ITEMS = 2;

function isFilled(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

function allFilled(values: string[]): boolean {
  return values.every((value) => isFilled(value));
}

function countBlanks(template: string): number {
  return template.split(FILL_BLANK_MARKER).length - 1;
}

/**
 * Rules the player relies on but the storage schema cannot express: every
 * blank needs its answer, a question needs a right option, and nothing a
 * learner reads may be empty. A step that breaks them would render but could
 * not be answered correctly.
 */
function isPlayable(edit: EditedStepContent): boolean {
  if (edit.kind === "fillBlank") {
    return (
      countBlanks(edit.content.template) === edit.content.answers.length &&
      allFilled([...edit.content.answers, ...edit.content.distractors, edit.content.template])
    );
  }

  if (edit.kind === "matchColumns") {
    return (
      edit.content.pairs.length >= MIN_ORDERED_ITEMS &&
      allFilled(edit.content.pairs.flatMap((pair) => [pair.left, pair.right]))
    );
  }

  if (edit.kind === "multipleChoice") {
    const ids = edit.content.options.map((option) => option.id);

    return (
      edit.content.options.some((option) => option.isCorrect) &&
      new Set(ids).size === ids.length &&
      allFilled([...ids, ...edit.content.options.map((option) => option.text)])
    );
  }

  if (edit.kind === "sortOrder") {
    return (
      edit.content.items.length >= MIN_ORDERED_ITEMS &&
      allFilled([...edit.content.items, edit.content.question])
    );
  }

  return edit.content.variant === "text"
    ? allFilled([edit.content.title, edit.content.text])
    : allFilled([edit.content.sentence, edit.content.translation]);
}

/**
 * Illustrations are generated artwork stored by the platform, so a reviewer
 * corrects the words around them and never supplies an image. The step keeps
 * whatever image it already had, whatever the edit contains.
 */
function withCurrentImage(
  content: EditedStepContent["content"],
  current: unknown,
): Record<string, unknown> {
  const words = Object.fromEntries(Object.entries(content).filter(([key]) => key !== "image"));
  const image = isJsonObject(current) ? current.image : undefined;

  return image === undefined ? words : { ...words, image };
}

/**
 * Turns a schema-valid edit into the content to store, or null when the edit
 * could not be played.
 */
export function toStoredStepContent({
  current,
  edit,
}: {
  current: unknown;
  edit: EditedStepContent;
}): Record<string, unknown> | null {
  if (!isPlayable(edit)) {
    return null;
  }

  return withCurrentImage(edit.content, current);
}
