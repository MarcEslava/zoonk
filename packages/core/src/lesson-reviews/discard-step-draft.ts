import "server-only";
import { prisma } from "@zoonk/db";
import { getStepReviewAccess } from "./_utils/review-access";

/**
 * Drops one step's pending correction, leaving the approved content in place.
 * Discarding a step without a draft changes nothing and records nothing.
 */
export async function discardStepDraft({ stepId }: { stepId: string }) {
  const access = await getStepReviewAccess(stepId);

  if (access.status !== "ready") {
    return access;
  }

  const { step, userId } = access;

  if (!step.draft) {
    return { status: "discarded" as const };
  }

  await prisma.$transaction([
    prisma.stepDraft.delete({ where: { id: step.draft.id } }),
    prisma.lessonReviewEvent.create({
      data: { action: "draftDiscarded", actorId: userId, lessonId: step.lessonId, stepId },
    }),
  ]);

  return { status: "discarded" as const };
}
