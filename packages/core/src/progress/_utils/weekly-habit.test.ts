import { describe, expect, it } from "vitest";
import { computeWeeklyHabit } from "./weekly-habit";

const GOAL = 180;

/** A learner-local calendar day, stored the way DailyProgress stores it. */
function day(isoDate: string, timeSpentSeconds = GOAL) {
  return { date: new Date(`${isoDate}T00:00:00.000Z`), timeSpentSeconds };
}

// 2026-09-28 is a Monday; the week runs to Sunday 2026-10-04.
const THURSDAY = new Date("2026-10-01T00:00:00.000Z");

describe(computeWeeklyHabit, () => {
  it("counts the current week once it reaches three working days", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [day("2026-09-28"), day("2026-09-29"), day("2026-10-01")],
      today: THURSDAY,
    });

    expect(habit).toMatchObject({ weekMetDays: 3, weeklyStreak: 1 });
  });

  it("keeps an unfinished week from breaking the streak built before it", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [
        day("2026-09-21"),
        day("2026-09-22"),
        day("2026-09-23"),
        day("2026-09-14"),
        day("2026-09-16"),
        day("2026-09-18"),
      ],
      today: THURSDAY,
    });

    expect(habit).toMatchObject({ weekMetDays: 0, weeklyStreak: 2 });
  });

  it("stops the streak at a finished week that missed the goal", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [
        day("2026-09-21"),
        day("2026-09-22"),
        day("2026-09-23"),
        day("2026-09-14"),
        day("2026-09-15"),
        day("2026-09-07"),
        day("2026-09-08"),
        day("2026-09-09"),
      ],
      today: THURSDAY,
    });

    expect(habit.weeklyStreak).toBe(1);
  });

  it("never counts weekend study, so rest days can never be required", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [day("2026-09-26"), day("2026-09-27"), day("2026-09-25"), day("2026-09-24")],
      today: THURSDAY,
    });

    expect(habit.weeklyStreak).toBe(0);
  });

  it("does not count a day that fell short of the daily goal", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [day("2026-09-28"), day("2026-09-29"), day("2026-10-01", GOAL - 1)],
      today: THURSDAY,
    });

    expect(habit).toMatchObject({ weekMetDays: 2, weeklyStreak: 0 });
  });

  it("reports today's minutes so far", () => {
    const habit = computeWeeklyHabit({
      dailyGoalSeconds: GOAL,
      days: [day("2026-10-01", 95)],
      today: THURSDAY,
    });

    expect(habit.todaySeconds).toBe(95);
  });
});
