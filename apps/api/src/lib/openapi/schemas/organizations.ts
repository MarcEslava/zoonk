import {
  REMINDER_EARLIEST_HOUR,
  REMINDER_LATEST_HOUR,
} from "@zoonk/core/organizations/reminder-schedule-contract";
import { z } from "zod";
import { organizationSummarySchema } from "./catalog-resources";

const currentUserOrganizationSchema = z
  .object({
    organization: organizationSummarySchema,
    role: z.string().meta({ description: "Role inside the organization: owner, admin or member" }),
  })
  .meta({ id: "CurrentUserOrganization" });

export const currentUserOrganizationListResponseSchema = z
  .object({ data: z.array(currentUserOrganizationSchema) })
  .meta({ id: "CurrentUserOrganizationListResponse" });

const organizationCourseSchema = z
  .object({
    id: z.uuid(),
    imageUrl: z.string().nullable(),
    language: z.string(),
    slug: z.string(),
    title: z.string(),
  })
  .meta({ id: "OrganizationCourse" });

const currentUserAssignmentSchema = z
  .object({
    assignedAt: z.iso
      .datetime()
      .meta({ description: "When this obligation began for the learner" }),
    course: organizationCourseSchema,
    dueAt: z.iso
      .datetime()
      .nullable()
      .meta({ description: "Deadline, or null for ongoing training" }),
    id: z.uuid().meta({ description: "Assignment ID" }),
    minDailySeconds: z
      .int()
      .nullable()
      .meta({ description: "Daily study the organization asks for, in seconds" }),
    organization: organizationSummarySchema,
  })
  .meta({ id: "CurrentUserAssignment" });

export const currentUserAssignmentListResponseSchema = z
  .object({ data: z.array(currentUserAssignmentSchema) })
  .meta({ id: "CurrentUserAssignmentListResponse" });

const weeklyHabitSchema = z
  .object({
    dailyGoalSeconds: z
      .int()
      .meta({ description: "Most demanding daily goal among live assignments" }),
    todaySeconds: z
      .int()
      .meta({ description: "Seconds studied today, in the learner's local day" }),
    weekGoalDays: z.int().meta({ description: "Working days a week must meet the goal on" }),
    weekMetDays: z.int().meta({ description: "Working days this week that met the goal" }),
    weeklyStreak: z.int().meta({ description: "Consecutive weeks that kept the habit" }),
  })
  .meta({
    description:
      "The learner's own weekly habit. Weekends never count, and no organization can read it.",
    id: "WeeklyHabit",
  });

export const currentUserHabitResponseSchema = z
  .object({
    habit: weeklyHabitSchema
      .nullable()
      .meta({ description: "Null when no organization asks the learner for daily study" }),
  })
  .meta({ id: "CurrentUserHabitResponse" });

export const memberTagSchema = z
  .object({
    id: z.uuid(),
    name: z.string().meta({ description: "Normalized segment name, such as zona:levante" }),
  })
  .meta({ id: "MemberTag" });

export const memberTagListResponseSchema = z
  .object({ data: z.array(memberTagSchema) })
  .meta({ id: "MemberTagListResponse" });

export const createMemberTagRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .meta({
        description: "Segment name. It is trimmed, lowercased and spaces around colons are removed",
      }),
  })
  .meta({ id: "CreateMemberTagRequest" });

const organizationMemberSchema = z
  .object({
    id: z.uuid().meta({ description: "Organization member ID" }),
    name: z.string(),
    role: z.string().meta({ description: "Role inside the organization: owner, admin or member" }),
    tags: z.array(memberTagSchema),
  })
  .meta({ id: "OrganizationMember" });

export const organizationMemberListResponseSchema = z
  .object({ data: z.array(organizationMemberSchema) })
  .meta({ id: "OrganizationMemberListResponse" });

export const setMemberTagsRequestSchema = z
  .object({
    tagIds: z
      .array(z.uuid())
      .meta({ description: "The member's complete set of segments; it replaces the current one" }),
  })
  .meta({ id: "SetMemberTagsRequest" });

export const setMemberTagsResponseSchema = z
  .object({
    reconciledAssignments: z
      .int()
      .meta({ description: "Assignments whose recipients were updated to follow the change" }),
  })
  .meta({ id: "SetMemberTagsResponse" });

export const assignableCourseListResponseSchema = z
  .object({ data: z.array(organizationCourseSchema) })
  .meta({ id: "AssignableCourseListResponse" });

const organizationAssignmentSchema = z
  .object({
    course: organizationCourseSchema,
    dueAt: z.iso.datetime().nullable(),
    id: z.uuid(),
    minDailySeconds: z.int().nullable(),
    openRecipientCount: z.int().meta({ description: "People the assignment reaches today" }),
    targetMembers: z.array(z.string()).meta({ description: "Names of people chosen directly" }),
    targetTags: z.array(z.string()).meta({ description: "Segments the assignment was asked of" }),
  })
  .meta({ id: "OrganizationAssignment" });

export const organizationAssignmentListResponseSchema = z
  .object({ data: z.array(organizationAssignmentSchema) })
  .meta({ id: "OrganizationAssignmentListResponse" });

export const createAssignmentRequestSchema = z
  .object({
    courseId: z
      .uuid()
      .meta({ description: "A published course of this organization or of the public catalog" }),
    dueAt: z.iso.datetime().optional(),
    memberIds: z.array(z.uuid()).optional().meta({ description: "Members chosen directly" }),
    minDailySeconds: z.int().positive().optional(),
    tagIds: z
      .array(z.uuid())
      .optional()
      .meta({ description: "Segments whose current and future members are included" }),
  })
  .meta({
    description: "At least one member or segment is required",
    id: "CreateAssignmentRequest",
  });

export const createAssignmentResponseSchema = z
  .object({
    id: z.uuid(),
    recipientCount: z.int().meta({ description: "People the assignment reached when created" }),
  })
  .meta({ id: "CreateAssignmentResponse" });

export const reminderScheduleSchema = z
  .object({
    hour: z
      .int()
      .min(REMINDER_EARLIEST_HOUR)
      .max(REMINDER_LATEST_HOUR)
      .meta({ description: "Local hour of the working day when weekday reminders are sent" }),
    timeZone: z.string().min(1).meta({ description: "IANA time zone, such as Europe/Madrid" }),
  })
  .meta({ id: "ReminderSchedule" });

export const reminderScheduleResponseSchema = z
  .object({
    schedule: reminderScheduleSchema
      .nullable()
      .meta({ description: "Null when reminders are off" }),
  })
  .meta({ id: "ReminderScheduleResponse" });
