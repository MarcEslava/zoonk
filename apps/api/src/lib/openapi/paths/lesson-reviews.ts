import {
  courseReviewResponseSchema,
  editedStepRequestSchema,
  lessonApprovalResponseSchema,
  lessonReviewResponseSchema,
  reviewCourseListResponseSchema,
} from "../schemas/lesson-reviews";
import {
  coursePathParamsSchema,
  lessonPathParamsSchema,
  organizationPathParamsSchema,
  stepPathParamsSchema,
} from "../schemas/paths";
import {
  conflictResponse,
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
  unprocessableEntityResponse,
  validationErrorResponse,
} from "../schemas/responses";
import { AUTHENTICATED_SECURITY } from "../security";

/** Reviewing needs an organization admin or owner; a non-member reads not found. */
const reviewAccessResponses = {
  "400": validationErrorResponse,
  "401": unauthorizedResponse,
  "403": forbiddenResponse,
  "404": notFoundResponse,
};

const TAGS = ["Lesson review"];

export const lessonReviewPaths = {
  "/courses/{courseId}/review": {
    get: {
      operationId: "getCourseReview",
      requestParams: { path: coursePathParamsSchema },
      responses: {
        "200": {
          content: { "application/json": { schema: courseReviewResponseSchema } },
          description: "Every chapter and lesson, published or not, with pending corrections",
        },
        ...reviewAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Outline a course for review",
      tags: TAGS,
    },
  },
  "/lessons/{lessonId}/approval": {
    post: {
      description:
        "Copies the lesson's drafts into what the team sees and publishes the lesson. Refused with 403 for anyone who edited the lesson since its last approval, and with 409 when nothing waits for approval.",
      operationId: "approveLesson",
      requestParams: { path: lessonPathParamsSchema },
      responses: {
        "200": {
          content: { "application/json": { schema: lessonApprovalResponseSchema } },
          description: "Lesson approved and published",
        },
        ...reviewAccessResponses,
        "409": conflictResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Approve a lesson",
      tags: TAGS,
    },
  },
  "/lessons/{lessonId}/review": {
    get: {
      operationId: "getLessonReview",
      requestParams: { path: lessonPathParamsSchema },
      responses: {
        "200": {
          content: { "application/json": { schema: lessonReviewResponseSchema } },
          description: "The lesson's steps, pending corrections and history",
        },
        ...reviewAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Review a lesson",
      tags: TAGS,
    },
  },
  "/organizations/{organizationId}/courses": {
    get: {
      operationId: "listOrganizationCourses",
      requestParams: { path: organizationPathParamsSchema },
      responses: {
        "200": {
          content: { "application/json": { schema: reviewCourseListResponseSchema } },
          description: "The organization's own courses, drafts included",
        },
        ...reviewAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List an organization's courses for review",
      tags: TAGS,
    },
  },
  "/steps/{stepId}/draft": {
    delete: {
      operationId: "discardStepDraft",
      requestParams: { path: stepPathParamsSchema },
      responses: { "204": { description: "Draft discarded" }, ...reviewAccessResponses },
      security: AUTHENTICATED_SECURITY,
      summary: "Discard a step's correction",
      tags: TAGS,
    },
    put: {
      description:
        "Saves a correction as a draft. The team keeps seeing the approved content until someone else approves the lesson.",
      operationId: "saveStepDraft",
      requestBody: {
        content: { "application/json": { schema: editedStepRequestSchema } },
        required: true,
      },
      requestParams: { path: stepPathParamsSchema },
      responses: {
        "204": { description: "Draft saved" },
        ...reviewAccessResponses,
        "422": unprocessableEntityResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Save a step's correction",
      tags: TAGS,
    },
  },
};
