import {
  currentUserAssignmentListResponseSchema,
  currentUserHabitResponseSchema,
  currentUserOrganizationListResponseSchema,
} from "../schemas/organizations";
import { unauthorizedResponse } from "../schemas/responses";
import { AUTHENTICATED_SECURITY } from "../security";

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
};
