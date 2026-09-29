import { type getCourseReview } from "@zoonk/core/lesson-reviews/get-course-review";
import { type getLessonReview } from "@zoonk/core/lesson-reviews/get-lesson-review";

type CourseReview = Extract<Awaited<ReturnType<typeof getCourseReview>>, { status: "ready" }>;
type LessonReview = Extract<Awaited<ReturnType<typeof getLessonReview>>, { status: "ready" }>;

/** Drops the organization id, which the caller already used to reach the course. */
export function toCourseReview(review: CourseReview) {
  return {
    chapters: review.chapters,
    course: {
      id: review.course.id,
      isPublished: review.course.isPublished,
      title: review.course.title,
    },
  };
}

/**
 * A draft is published as the same `{ kind, content }` edit a client sends back,
 * so a native editor can round-trip it without knowing how it is stored.
 */
function toReviewStep(step: LessonReview["steps"][number]) {
  return {
    content: step.content,
    draft: step.draft && {
      edit: { content: step.draft.content, kind: step.kind },
      editedByName: step.draft.editedByName,
      updatedAt: step.draft.updatedAt,
    },
    id: step.id,
    isEditable: step.isEditable,
    kind: step.kind,
    position: step.position,
  };
}

export function toLessonReview(review: LessonReview) {
  return {
    canApprove: review.canApprove,
    hasPendingChanges: review.hasPendingChanges,
    history: review.history,
    isOwnChange: review.isOwnChange,
    lesson: {
      chapterId: review.lesson.chapterId,
      chapterTitle: review.lesson.chapterTitle,
      courseId: review.lesson.courseId,
      courseTitle: review.lesson.courseTitle,
      id: review.lesson.id,
      isPublished: review.lesson.isPublished,
      title: review.lesson.title,
    },
    steps: review.steps.map((step) => toReviewStep(step)),
  };
}
