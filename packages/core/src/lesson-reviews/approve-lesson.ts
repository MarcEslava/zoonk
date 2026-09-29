import "server-only";
import { getPublishedStepWhere, prisma } from "@zoonk/db";
import { revalidateTag } from "next/cache";
import {
  getChapterLessonsCacheTag,
  getCourseCurriculumCacheTag,
  getLessonCacheTag,
} from "../cache/tags";
import { getPendingReview } from "./_utils/pending-review";
import { getLessonReviewAccess } from "./_utils/review-access";

/**
 * Approves one lesson and makes it what the team sees.
 *
 * Pending drafts replace the steps' content and the lesson is published, all
 * in one transaction, so learners never see half an approval. Whoever edited
 * the lesson since its last approval cannot approve it: a second person always
 * reviews a change. The history keeps the exact content that became visible.
 */
export async function approveLesson({ lessonId }: { lessonId: string }) {
  const access = await getLessonReviewAccess(lessonId);

  if (access.status !== "ready") {
    return access;
  }

  const { lesson, userId } = access;
  const { drafts, editorIds } = await getPendingReview({ lessonId });

  if (drafts.length === 0 && lesson.isPublished) {
    return { status: "nothingToApprove" as const };
  }

  if (editorIds.has(userId)) {
    return { status: "ownChanges" as const };
  }

  await prisma.$transaction(async (transaction) => {
    await Promise.all(
      drafts.map((draft) =>
        transaction.step.update({
          data: { content: draft.content ?? {} },
          where: { id: draft.stepId },
        }),
      ),
    );

    await transaction.stepDraft.deleteMany({ where: { id: { in: drafts.map(({ id }) => id) } } });
    await transaction.lesson.update({ data: { isPublished: true }, where: { id: lessonId } });

    const approvedSteps = await transaction.step.findMany({
      orderBy: { position: "asc" },
      select: { content: true, id: true, kind: true, position: true },
      where: { lessonId, ...getPublishedStepWhere() },
    });

    await transaction.lessonReviewEvent.create({
      data: { action: "approved", actorId: userId, content: approvedSteps, lessonId },
    });
  });

  revalidateTag(getLessonCacheTag(lessonId), { expire: 0 });
  revalidateTag(getChapterLessonsCacheTag(lesson.chapterId), { expire: 0 });
  revalidateTag(getCourseCurriculumCacheTag(lesson.chapter.courseId), { expire: 0 });

  return { approvedDrafts: drafts.length, status: "approved" as const };
}
