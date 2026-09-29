import "server-only";
import { prisma } from "@zoonk/db";
import { parseStepContent } from "../steps/contract/content";
import { toStoredStepContent } from "./_utils/edited-content";
import { getStepReviewAccess } from "./_utils/review-access";
import { editedStepContentSchema, isEditableStepKind } from "./contract";

/**
 * Saves a reviewer's correction of one step as a draft.
 *
 * Nothing a learner sees changes here: the draft waits for someone else to
 * approve the lesson. Each save is also written to the lesson's history with
 * the content it stored, so every intermediate wording stays on record.
 */
export async function saveStepDraft({ edit, stepId }: { edit: unknown; stepId: string }) {
  const access = await getStepReviewAccess(stepId);

  if (access.status !== "ready") {
    return access;
  }

  const { step, userId } = access;

  if (!isEditableStepKind(step.kind)) {
    return { status: "notEditable" as const };
  }

  const parsed = editedStepContentSchema.safeParse(edit);

  if (!parsed.success || parsed.data.kind !== step.kind) {
    return { status: "invalidContent" as const };
  }

  const stored = toStoredStepContent({
    current: step.draft?.content ?? step.content,
    edit: parsed.data,
  });

  if (!stored) {
    return { status: "invalidContent" as const };
  }

  const content = parseStepContent(step.kind, stored);

  await prisma.$transaction([
    prisma.stepDraft.upsert({
      create: { content, editedById: userId, stepId },
      update: { content, editedById: userId },
      where: { stepId },
    }),
    prisma.lessonReviewEvent.create({
      data: { action: "stepEdited", actorId: userId, content, lessonId: step.lessonId, stepId },
    }),
  ]);

  return { status: "saved" as const };
}
