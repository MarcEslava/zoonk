import "server-only";
import { prisma } from "@zoonk/db";
import { isValidTimeZone } from "@zoonk/utils/time-zone";
import { getOrganizationAccess } from "./get-organization-access";

/**
 * Reminders may only be scheduled inside a working day. The bounds are
 * enforced here rather than in a form, so no caller can schedule a reminder
 * for the evening, when people are entitled to be offline.
 */
export const REMINDER_EARLIEST_HOUR = 8;
export const REMINDER_LATEST_HOUR = 19;

function isWorkingHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= REMINDER_EARLIEST_HOUR && hour <= REMINDER_LATEST_HOUR;
}

/**
 * Reads when an organization reminds its team. Returns null when the caller
 * may not manage the organization, and a null schedule when reminders are off.
 */
export async function getOrganizationReminderSchedule({
  organizationId,
}: {
  organizationId: string;
}) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { organization: ["update"] },
  });

  if (access.status !== "ready") {
    return null;
  }

  const schedule = await prisma.organizationReminderSchedule.findUnique({
    where: { organizationId },
  });

  return { schedule };
}

/**
 * Turns an organization's weekday reminders on at one local hour, or off.
 * Turning them off removes the schedule entirely rather than keeping a flag.
 */
export async function setOrganizationReminderSchedule({
  hour,
  organizationId,
  schedule,
  timeZone,
}: {
  hour: number;
  organizationId: string;
  schedule: "on" | "off";
  timeZone: string;
}) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { organization: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  if (schedule === "off") {
    await prisma.organizationReminderSchedule.deleteMany({ where: { organizationId } });
    return { status: "saved" as const };
  }

  if (!isWorkingHour(hour) || !isValidTimeZone(timeZone)) {
    return { status: "invalidSchedule" as const };
  }

  await prisma.organizationReminderSchedule.upsert({
    create: { hour, organizationId, timeZone },
    update: { hour, timeZone },
    where: { organizationId },
  });

  return { status: "saved" as const };
}
