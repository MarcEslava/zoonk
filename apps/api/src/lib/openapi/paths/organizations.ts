import {
  assignableCourseListResponseSchema,
  createAssignmentRequestSchema,
  createAssignmentResponseSchema,
  createMemberTagRequestSchema,
  currentUserAssignmentListResponseSchema,
  currentUserHabitResponseSchema,
  currentUserOrganizationListResponseSchema,
  memberTagListResponseSchema,
  memberTagSchema,
  organizationAssignmentListResponseSchema,
  organizationMemberListResponseSchema,
  reminderScheduleResponseSchema,
  reminderScheduleSchema,
  setMemberTagsRequestSchema,
  setMemberTagsResponseSchema,
} from "../schemas/organizations";
import { organizationMemberPathParamsSchema, organizationPathParamsSchema } from "../schemas/paths";
import {
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
  unprocessableEntityResponse,
  validationErrorResponse,
} from "../schemas/responses";
import { AUTHENTICATED_SECURITY } from "../security";

/** Every organization-scoped operation is refused the same way. */
const organizationAccessResponses = {
  "400": validationErrorResponse,
  "401": unauthorizedResponse,
  "403": forbiddenResponse,
  "404": { ...notFoundResponse, description: "Organization not found or caller is not a member" },
};

const organizationPathParams = { path: organizationPathParamsSchema };

export const organizationPaths = {
  "/me/assignments": {
    get: {
      operationId: "listCurrentUserAssignments",
      responses: {
        "200": {
          content: { "application/json": { schema: currentUserAssignmentListResponseSchema } },
          description: "Courses the learner's organizations currently require",
        },
        "401": unauthorizedResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List current user's assigned courses",
      tags: ["Organizations"],
    },
  },
  "/me/habit": {
    get: {
      operationId: "getCurrentUserHabit",
      responses: {
        "200": {
          content: { "application/json": { schema: currentUserHabitResponseSchema } },
          description: "The learner's own weekly habit",
        },
        "401": unauthorizedResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Get current user's weekly habit",
      tags: ["Organizations"],
    },
  },
  "/me/organizations": {
    get: {
      operationId: "listCurrentUserOrganizations",
      responses: {
        "200": {
          content: { "application/json": { schema: currentUserOrganizationListResponseSchema } },
          description: "Organizations the current user belongs to, with their role",
        },
        "401": unauthorizedResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List current user's organizations",
      tags: ["Organizations"],
    },
  },
  "/organization-members/{memberId}/tags": {
    put: {
      description:
        "Replaces the member's segments. Assignments that follow the added or removed segments are reconciled before the response.",
      operationId: "setOrganizationMemberTags",
      requestBody: {
        content: { "application/json": { schema: setMemberTagsRequestSchema } },
        required: true,
      },
      requestParams: { path: organizationMemberPathParamsSchema },
      responses: {
        "200": {
          content: { "application/json": { schema: setMemberTagsResponseSchema } },
          description: "Segments replaced",
        },
        ...organizationAccessResponses,
        "404": { ...notFoundResponse, description: "Member not found or caller is not a member" },
        "422": unprocessableEntityResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Replace an organization member's segments",
      tags: ["Organizations"],
    },
  },
  "/organizations/{organizationId}/assignable-courses": {
    get: {
      operationId: "listAssignableCourses",
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: assignableCourseListResponseSchema } },
          description: "The organization's own published courses",
        },
        ...organizationAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List courses an organization can assign",
      tags: ["Organizations"],
    },
  },
  "/organizations/{organizationId}/assignments": {
    get: {
      operationId: "listOrganizationAssignments",
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: organizationAssignmentListResponseSchema } },
          description: "What the organization currently requires, newest first",
        },
        ...organizationAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List an organization's assignments",
      tags: ["Organizations"],
    },
    post: {
      description:
        "Requires one course from members chosen directly or through segments. People who join a segment later are included automatically.",
      operationId: "createOrganizationAssignment",
      requestBody: {
        content: { "application/json": { schema: createAssignmentRequestSchema } },
        required: true,
      },
      requestParams: organizationPathParams,
      responses: {
        "201": {
          content: { "application/json": { schema: createAssignmentResponseSchema } },
          description: "Assignment created",
        },
        ...organizationAccessResponses,
        "422": unprocessableEntityResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Assign a course",
      tags: ["Organizations"],
    },
  },
  "/organizations/{organizationId}/members": {
    get: {
      operationId: "listOrganizationMembers",
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: organizationMemberListResponseSchema } },
          description: "The organization's team with each person's segments",
        },
        ...organizationAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List an organization's members",
      tags: ["Organizations"],
    },
  },
  "/organizations/{organizationId}/reminder-schedule": {
    delete: {
      operationId: "deleteOrganizationReminderSchedule",
      requestParams: organizationPathParams,
      responses: { "204": { description: "Reminders turned off" }, ...organizationAccessResponses },
      security: AUTHENTICATED_SECURITY,
      summary: "Turn an organization's reminders off",
      tags: ["Organizations"],
    },
    get: {
      operationId: "getOrganizationReminderSchedule",
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: reminderScheduleResponseSchema } },
          description: "When the organization reminds its team on weekdays",
        },
        ...organizationAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Get an organization's reminder schedule",
      tags: ["Organizations"],
    },
    put: {
      description:
        "Sends weekday reminders at one local hour of the working day. Evenings and weekends are never allowed.",
      operationId: "setOrganizationReminderSchedule",
      requestBody: {
        content: { "application/json": { schema: reminderScheduleSchema } },
        required: true,
      },
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: reminderScheduleResponseSchema } },
          description: "Reminder schedule saved",
        },
        ...organizationAccessResponses,
        "400": badRequestResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Set an organization's reminder schedule",
      tags: ["Organizations"],
    },
  },
  "/organizations/{organizationId}/tags": {
    get: {
      operationId: "listOrganizationTags",
      requestParams: organizationPathParams,
      responses: {
        "200": {
          content: { "application/json": { schema: memberTagListResponseSchema } },
          description: "The organization's segment vocabulary",
        },
        ...organizationAccessResponses,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "List an organization's segments",
      tags: ["Organizations"],
    },
    post: {
      operationId: "createOrganizationTag",
      requestBody: {
        content: { "application/json": { schema: createMemberTagRequestSchema } },
        required: true,
      },
      requestParams: organizationPathParams,
      responses: {
        "201": {
          content: { "application/json": { schema: memberTagSchema } },
          description: "Segment created",
        },
        ...organizationAccessResponses,
        "409": conflictResponse,
      },
      security: AUTHENTICATED_SECURITY,
      summary: "Create a segment",
      tags: ["Organizations"],
    },
  },
};
