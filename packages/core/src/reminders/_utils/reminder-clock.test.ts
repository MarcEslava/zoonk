import { describe, expect, it } from "vitest";
import { getReminderClock, isReminderDue } from "./reminder-clock";

const MADRID = "Europe/Madrid";

describe(isReminderDue, () => {
  it("is due at the chosen hour on a working day in the organization's time zone", () => {
    // Tuesday 08:30 UTC is 10:30 in Madrid during summer time.
    const now = new Date("2026-09-29T08:30:00.000Z");

    expect(isReminderDue({ hour: 10, now, timeZone: MADRID })).toBe(true);
    expect(isReminderDue({ hour: 11, now, timeZone: MADRID })).toBe(false);
  });

  it("follows the organization's clock across the change back from summer time", () => {
    // Monday after the October change: 09:30 UTC is 10:30 in Madrid again.
    const now = new Date("2026-10-26T09:30:00.000Z");

    expect(isReminderDue({ hour: 10, now, timeZone: MADRID })).toBe(true);
  });

  it("is never due at a weekend", () => {
    const saturday = new Date("2026-10-03T08:30:00.000Z");

    expect(isReminderDue({ hour: 10, now: saturday, timeZone: MADRID })).toBe(false);
  });

  it("uses the organization's day, not the server's, near midnight", () => {
    // Friday 23:30 UTC is already Saturday 01:30 in Madrid.
    const now = new Date("2026-10-02T23:30:00.000Z");

    expect(getReminderClock({ now, timeZone: MADRID }).date).toStrictEqual(
      new Date("2026-10-03T00:00:00.000Z"),
    );

    expect(isReminderDue({ hour: 1, now, timeZone: MADRID })).toBe(false);
  });
});
