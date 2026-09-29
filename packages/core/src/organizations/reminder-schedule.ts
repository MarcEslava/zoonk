import "server-only";
import { prisma } from "@zoonk/db";
import { isValidTimeZone } from "@zoonk/utils/time-zone";
import { getOrganizationAccess } from "./get-organization-access";
import { REMINDER_EARLIEST_HOUR, REMINDER_LATEST_HOUR } from "./reminder-schedule-contract";

function isWorkingHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= REMINDER_EARLIEST_HOUR && hour <= REMINDER_LATEST_HOUR;
}

/**
 * Reads when an organization reminds its team. Returns the access outcome when
 * the caller may not manage the organization, and a null schedule when
 * reminders are off.
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
    return access;
  }

  const schedule = await prisma.organizationReminderSchedule.findUnique({
    where: { organizationId },
  });

  return { schedule, status: "ready" as const };
}

/**
 * Turns an organization's weekday reminders on at one local hour, or off with a
 * null schedule. Turning them off removes the schedule entirely rather than
 * keeping a flag.
 */
export async function setOrganizationReminderSchedule({
  organizationId,
  schedule,
}: {
  organizationId: string;
  schedule: { hour: number; timeZone: string } | null;
}) {
  const access = await getOrganizationAccess({
    organizationId,
    permissions: { organization: ["update"] },
  });

  if (access.status !== "ready") {
    return access;
  }

  if (!schedule) {
    await prisma.organizationReminderSchedule.deleteMany({ where: { organizationId } });
    return { status: "saved" as const };
  }

  const { hour, timeZone } = schedule;

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
