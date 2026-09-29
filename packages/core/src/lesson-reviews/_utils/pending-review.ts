import "server-only";
import { prisma } from "@zoonk/db";

/**
 * What an approval of one lesson would cover: the drafts waiting on its steps
 * and everyone who edited it since its last approval.
 *
 * Editors are read from the history rather than from the drafts themselves, so
 * a person whose wording someone else later reworked still counts as an author
 * of the version waiting for approval.
 */
export async function getPendingReview({ lessonId }: { lessonId: string }) {
  const lastApproval = await prisma.lessonReviewEvent.findFirst({
    orderBy: { createdAt: "desc" },
    where: { action: "approved", lessonId },
  });

  const [drafts, edits] = await Promise.all([
    prisma.stepDraft.findMany({ where: { step: { lessonId } } }),
    prisma.lessonReviewEvent.findMany({
      distinct: ["actorId"],
      select: { actorId: true },
      where: {
        action: "stepEdited",
        lessonId,
        ...(lastApproval && { createdAt: { gt: lastApproval.createdAt } }),
      },
    }),
  ]);

  return {
    drafts,
    editorIds: new Set(edits.flatMap((edit) => (edit.actorId ? [edit.actorId] : []))),
  };
}
