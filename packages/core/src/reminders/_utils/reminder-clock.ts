import { getDateInTimeZone } from "@zoonk/utils/time-zone";
import { isWorkday } from "../../_utils/workday";

function getLocalHour({ now, timeZone }: { now: Date; timeZone: string }): number {
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;

  return Number(hour);
}

/**
 * The organization's local calendar day and hour at `now`. The day uses the
 * same UTC-midnight form as daily progress, so it can be compared directly.
 */
export function getReminderClock({ now, timeZone }: { now: Date; timeZone: string }) {
  return {
    date: getDateInTimeZone({ date: now, timeZone }),
    hour: getLocalHour({ now, timeZone }),
  };
}

/**
 * A reminder is due only on a working day in the organization's time zone and
 * only during the hour it chose, so reminders never reach anyone at a weekend
 * or outside the time their employer set for training.
 */
export function isReminderDue({
  hour,
  now,
  timeZone,
}: {
  hour: number;
  now: Date;
  timeZone: string;
}): boolean {
  const clock = getReminderClock({ now, timeZone });
  return isWorkday(clock.date) && clock.hour === hour;
}
