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

const assignedCourseSchema = z
  .object({
    id: z.uuid(),
    imageUrl: z.string().nullable(),
    language: z.string(),
    slug: z.string(),
    title: z.string(),
  })
  .meta({ id: "AssignedCourse" });

const currentUserAssignmentSchema = z
  .object({
    assignedAt: z.iso
      .datetime()
      .meta({ description: "When this obligation began for the learner" }),
    course: assignedCourseSchema,
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
