import { getContributionCalendarDateKey } from "@zoonk/utils/contribution-calendar";

/**
 * A week keeps the habit when the daily goal is met on at least this many
 * working days. Asking for three of five lets a sick day, a holiday or a short
 * leave pass without breaking anything, so the habit never pressures anyone to
 * study in time they are entitled to rest.
 */
export const HABIT_WEEK_GOAL_DAYS = 3;

/** How far back a streak can reach; also bounds the rows the query loads. */
const HABIT_LOOKBACK_WEEKS = 52;

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;
const WEEK_MS = DAYS_PER_WEEK * DAY_MS;

/** `Date#getUTCDay` numbering, where Sunday is 0. */
const MONDAY = 1;
const FRIDAY = 5;

type HabitDay = { date: Date; timeSpentSeconds: number };

export type WeeklyHabit = {
  dailyGoalSeconds: number;
  todaySeconds: number;
  weekGoalDays: number;
  weekMetDays: number;
  weeklyStreak: number;
};

/**
 * Progress dates are the learner's local calendar day stored at UTC midnight,
 * so the UTC weekday is the local one and UTC arithmetic has no daylight-saving
 * gaps. Weekends never count, whatever the learner does on them.
 */
function isWorkday(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday >= MONDAY && weekday <= FRIDAY;
}

/** Monday of the local week that contains `date`. */
function getWeekStart(date: Date): Date {
  const daysSinceMonday = (date.getUTCDay() + DAYS_PER_WEEK - MONDAY) % DAYS_PER_WEEK;
  return new Date(date.getTime() - daysSinceMonday * DAY_MS);
}

/** The earliest progress date a streak computed for `today` can depend on. */
export function getHabitWindowStart(today: Date): Date {
  return new Date(getWeekStart(today).getTime() - HABIT_LOOKBACK_WEEKS * WEEK_MS);
}

/**
 * Turns a learner's daily progress into their weekly habit.
 *
 * The current week only adds to the streak once it reaches the goal and never
 * breaks it while it is still in progress: a Monday without study says nothing
 * yet about the week.
 */
export function computeWeeklyHabit({
  dailyGoalSeconds,
  days,
  today,
}: {
  dailyGoalSeconds: number;
  days: HabitDay[];
  today: Date;
}): WeeklyHabit {
  const metDays = days.filter(
    (day) => isWorkday(day.date) && day.timeSpentSeconds >= dailyGoalSeconds,
  );

  const metDaysByWeek = Map.groupBy(metDays, (day) =>
    getContributionCalendarDateKey(getWeekStart(day.date)),
  );

  const countMetDays = (weekStart: Date) =>
    metDaysByWeek.get(getContributionCalendarDateKey(weekStart))?.length ?? 0;

  const currentWeek = getWeekStart(today);
  const weekMetDays = countMetDays(currentWeek);

  const pastWeeks = Array.from(
    { length: HABIT_LOOKBACK_WEEKS },
    (_, index) => new Date(currentWeek.getTime() - (index + 1) * WEEK_MS),
  );

  const firstMissedWeek = pastWeeks.findIndex(
    (weekStart) => countMetDays(weekStart) < HABIT_WEEK_GOAL_DAYS,
  );

  const pastStreak = firstMissedWeek === -1 ? HABIT_LOOKBACK_WEEKS : firstMissedWeek;
  const todayKey = getContributionCalendarDateKey(today);

  return {
    dailyGoalSeconds,
    todaySeconds:
      days.find((day) => getContributionCalendarDateKey(day.date) === todayKey)?.timeSpentSeconds ??
      0,
    weekGoalDays: HABIT_WEEK_GOAL_DAYS,
    weekMetDays,
    weeklyStreak: pastStreak + (weekMetDays >= HABIT_WEEK_GOAL_DAYS ? 1 : 0),
  };
}
