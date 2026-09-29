import { z } from "zod";
import {
  fillBlankContentSchema,
  matchColumnsContentSchema,
  multipleChoiceContentSchema,
  sortOrderContentSchema,
} from "../steps/contract/exercise";
import { staticContentSchema } from "../steps/contract/static";

/**
 * The step kinds a reviewer can correct. Language-only kinds are left out, and
 * so are kinds whose content lives in related word or sentence rows rather
 * than in the step itself.
 */
const EDITABLE_STEP_KINDS = [
  "fillBlank",
  "matchColumns",
  "multipleChoice",
  "sortOrder",
  "static",
] as const;

export type EditableStepKind = (typeof EDITABLE_STEP_KINDS)[number];

/**
 * One edited step, validated against the same contracts the player reads. The
 * kind travels with the content so a client cannot save one kind's shape onto
 * another kind's step.
 */
export const editedStepContentSchema = z.discriminatedUnion("kind", [
  z.object({ content: fillBlankContentSchema, kind: z.literal("fillBlank") }),
  z.object({ content: matchColumnsContentSchema, kind: z.literal("matchColumns") }),
  z.object({ content: multipleChoiceContentSchema, kind: z.literal("multipleChoice") }),
  z.object({ content: sortOrderContentSchema, kind: z.literal("sortOrder") }),
  z.object({ content: staticContentSchema, kind: z.literal("static") }),
]);

export type EditedStepContent = z.infer<typeof editedStepContentSchema>;

export function isEditableStepKind(kind: string): kind is EditableStepKind {
  return EDITABLE_STEP_KINDS.some((editable) => editable === kind);
}
