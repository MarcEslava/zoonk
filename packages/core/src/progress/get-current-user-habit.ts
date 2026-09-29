import "server-only";
import { prisma } from "@zoonk/db";
import { getSession } from "../users/get-session";
import { getProgressSession } from "./_utils/progress-cache";
import { type WeeklyHabit, computeWeeklyHabit, getHabitWindowStart } from "./_utils/weekly-habit";
import { getRequestProgressDateContext } from "./get-request-date-context";

/**
 * The most demanding daily target among the learner's live obligations. Only
 * open periods of current members count, matching what the learner is shown
 * as assigned.
 */
async function findDailyGoalSeconds(userId: string): Promise<number | null> {
  const period = await prisma.assignmentRecipient.findFirst({
    orderBy: { assignment: { minDailySeconds: "desc" } },
    select: { assignment: { select: { minDailySeconds: true } } },
    where: {
      assignment: { minDailySeconds: { not: null } },
      memberId: { not: null },
      removedAt: null,
      userId,
    },
  });

  return period?.assignment.minDailySeconds ?? null;
}

/**
 * Returns the signed-in learner's own weekly habit, or null when no
 * organization asks them for daily study.
 *
 * This is the learner's tool, not the employer's: it reads only the caller's
 * own progress, derives everything from rows that already exist, and no
 * organization capability exposes it. Employers see whether assigned training
 * is completed, never how much or when someone studies.
 */
export async function getCurrentUserHabit(): Promise<WeeklyHabit | null> {
  "use cache: private";

  const [session, dateContext] = await Promise.all([
    getProgressSession(),
    getRequestProgressDateContext(),
  ]);

  if (!session) {
    return null;
  }

  const dailyGoalSeconds = await findDailyGoalSeconds(session.user.id);

  if (!dailyGoalSeconds) {
    return null;
  }

  const days = await prisma.dailyProgress.findMany({
    select: { date: true, timeSpentSeconds: true },
    where: { date: { gte: getHabitWindowStart(dateContext.currentDate) }, userId: session.user.id },
  });

  return computeWeeklyHabit({ dailyGoalSeconds, days, today: dateContext.currentDate });
}

/**
 * Wraps the habit as a current-user resource so delivery adapters can tell
 * missing authentication apart from a learner no organization asks for daily
 * study, whose habit is null. The plain session read keeps this check outside
 * the private cache, where progress cache tags cannot be applied.
 */
export async function getCurrentUserHabitResource(): Promise<{ habit: WeeklyHabit | null } | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return { habit: await getCurrentUserHabit() };
}
