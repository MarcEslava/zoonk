import "server-only";
import { getPublishedStepWhere, prisma } from "@zoonk/db";
import { getPendingReview } from "./_utils/pending-review";
import { getLessonReviewAccess } from "./_utils/review-access";
import { isEditableStepKind } from "./contract";

const HISTORY_LIMIT = 50;

/**
 * Everything a reviewer needs to correct and approve one lesson: the steps as
 * learners see them, the drafts waiting on them, whether the caller may
 * approve, and the most recent history.
 *
 * Uncached like every authorization-dependent read, and because a reviewer
 * must see a colleague's draft as soon as it is saved.
 */
export async function getLessonReview({ lessonId }: { lessonId: string }) {
  const access = await getLessonReviewAccess(lessonId);

  if (access.status !== "ready") {
    return access;
  }

  const { lesson, userId } = access;

  const [steps, pending, history] = await Promise.all([
    prisma.step.findMany({
      include: { draft: { include: { editedBy: true } } },
      orderBy: { position: "asc" },
      where: { lessonId, ...getPublishedStepWhere() },
    }),
    getPendingReview({ lessonId }),
    prisma.lessonReviewEvent.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      where: { lessonId },
    }),
  ]);

  const hasPendingChanges = pending.drafts.length > 0 || !lesson.isPublished;
  const isOwnChange = pending.editorIds.has(userId);

  return {
    canApprove: hasPendingChanges && !isOwnChange,
    hasPendingChanges,
    history: history.map((event) => ({
      action: event.action,
      actorName: event.actor?.name ?? null,
      createdAt: event.createdAt,
      id: event.id,
      stepId: event.stepId,
    })),
    isOwnChange,
    lesson: {
      chapterId: lesson.chapterId,
      chapterTitle: lesson.chapter.title,
      courseId: lesson.chapter.courseId,
      courseTitle: lesson.chapter.course.title,
      id: lesson.id,
      isPublished: lesson.isPublished,
      organizationId: lesson.chapter.course.organizationId,
      title: lesson.title,
    },
    status: "ready" as const,
    steps: steps.map((step) => ({
      content: step.content,
      draft: step.draft && {
        content: step.draft.content,
        editedByName: step.draft.editedBy.name,
        updatedAt: step.draft.updatedAt,
      },
      id: step.id,
      isEditable: isEditableStepKind(step.kind),
      kind: step.kind,
      position: step.position,
    })),
  };
}
