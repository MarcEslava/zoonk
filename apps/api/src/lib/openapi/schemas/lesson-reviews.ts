import { editedStepContentSchema } from "@zoonk/core/lesson-reviews/contract";
import { stepContentEnvelopeSchema } from "@zoonk/core/steps/contract/content";
import { z } from "zod";

export const editedStepRequestSchema = editedStepContentSchema.meta({
  description:
    "The whole corrected step. The kind must match the step's kind. Images are generated artwork and are kept as they are, so any image sent here is ignored.",
  id: "EditedStepContent",
});

export const reviewCourseListResponseSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.uuid(),
        imageUrl: z.string().nullable(),
        isPublished: z.boolean(),
        title: z.string(),
      }),
    ),
  })
  .meta({ id: "ReviewCourseListResponse" });

const reviewLessonSummarySchema = z
  .object({
    draftCount: z.int().meta({ description: "Steps with a correction waiting" }),
    id: z.uuid(),
    isPublished: z.boolean().meta({ description: "Whether the team can see the lesson" }),
    title: z.string().nullable(),
  })
  .meta({ id: "ReviewLessonSummary" });

const reviewChapterSchema = z
  .object({ id: z.uuid(), lessons: z.array(reviewLessonSummarySchema), title: z.string() })
  .meta({ id: "ReviewChapter" });

export const courseReviewResponseSchema = z
  .object({
    chapters: z.array(reviewChapterSchema),
    course: z.object({ id: z.uuid(), isPublished: z.boolean(), title: z.string() }),
  })
  .meta({ id: "CourseReviewResponse" });

const stepDraftSchema = z
  .object({ edit: editedStepRequestSchema, editedByName: z.string(), updatedAt: z.iso.datetime() })
  .meta({ id: "StepDraft" });

const reviewStepSchema = z
  .intersection(
    z.object({
      draft: stepDraftSchema
        .nullable()
        .meta({ description: "The correction waiting for approval, invisible to the team" }),
      id: z.uuid(),
      isEditable: z.boolean(),
      position: z.int(),
    }),
    stepContentEnvelopeSchema,
  )
  .meta({ description: "A step as the team sees it now", id: "ReviewStep" });

const reviewEventSchema = z
  .object({
    action: z.enum(["stepEdited", "draftDiscarded", "approved"]),
    actorName: z.string().nullable().meta({ description: "Null once the person was deleted" }),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
    stepId: z.uuid().nullable(),
  })
  .meta({ id: "LessonReviewEvent" });

export const lessonReviewResponseSchema = z
  .object({
    canApprove: z
      .boolean()
      .meta({ description: "Something waits for approval and the caller did not edit it" }),
    hasPendingChanges: z.boolean(),
    history: z.array(reviewEventSchema).meta({ description: "Most recent first" }),
    isOwnChange: z
      .boolean()
      .meta({
        description: "The caller edited the lesson since its last approval, so cannot approve it",
      }),
    lesson: z.object({
      chapterId: z.uuid(),
      chapterTitle: z.string(),
      courseId: z.uuid(),
      courseTitle: z.string(),
      id: z.uuid(),
      isPublished: z.boolean(),
      title: z.string().nullable(),
    }),
    steps: z.array(reviewStepSchema),
  })
  .meta({ id: "LessonReviewResponse" });

export const lessonApprovalResponseSchema = z
  .object({
    approvedDrafts: z.int().meta({ description: "Corrections that became visible to the team" }),
  })
  .meta({ id: "LessonApprovalResponse" });
