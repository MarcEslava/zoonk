import { getCurrentUserHabit } from "@zoonk/core/progress/get-current-user-habit";
import { getExtracted } from "next-intl/server";

/**
 * The learner's own view of their weekly habit. It states who can see it,
 * because a habit tool only works when people trust it is not surveillance.
 */
export async function HabitSummary() {
  const t = await getExtracted();
  const habit = await getCurrentUserHabit();

  if (!habit) {
    return null;
  }

  const goalMinutes = Math.round(habit.dailyGoalSeconds / 60);
  const todayMinutes = Math.floor(habit.todaySeconds / 60);

  return (
    <section
      aria-label={t("Your habit")}
      className="flex flex-col gap-3 rounded-2xl border px-4 py-3"
    >
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{t("Today")}</dt>
          <dd className="font-medium">
            {t("{done, number} of {goal, number} min", { done: todayMinutes, goal: goalMinutes })}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{t("This week")}</dt>
          <dd className="font-medium">
            {t("{done, number} of {goal, plural, one {# day} other {# days}}", {
              done: habit.weekMetDays,
              goal: habit.weekGoalDays,
            })}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{t("Streak")}</dt>
          <dd className="font-medium">
            {t("{count, plural, one {# week} other {# weeks}}", { count: habit.weeklyStreak })}
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground text-xs">
        {t(
          "Weekends never count. Only you can see your habit; your organization only sees whether you complete the assigned training.",
        )}
      </p>
    </section>
  );
}
