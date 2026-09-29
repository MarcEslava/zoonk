import "server-only";
import { isPrismaUniqueConstraintError, prisma } from "@zoonk/db";
import { safeAsync } from "@zoonk/utils/error";
import { isValidTimeZone } from "@zoonk/utils/time-zone";
import webPush from "web-push";
import { getReminderClock, isReminderDue } from "../_utils/reminder-clock";

const DAY_MS = 86_400_000;

/** Deliveries only exist to keep reminders to one a day, so a week is plenty. */
const DELIVERY_RETENTION_DAYS = 7;

/** Four hours: a reminder about today's training is worthless tomorrow. */
const PUSH_TIME_TO_LIVE_SECONDS = 14_400;

const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;

/** The push services answer these when a browser subscription no longer exists. */
const EXPIRED_SUBSCRIPTION_STATUS = new Set([HTTP_NOT_FOUND, HTTP_GONE]);

export type ReminderMessage = { body: string; title: string };

type VapidDetails = { privateKey: string; publicKey: string; subject: string };

type Candidate = { goalSeconds: number; language: string; userId: string };

type Subscription = { auth: string; endpoint: string; id: string; p256dh: string };

/**
 * One row per learner an organization currently asks for daily study, with the
 * most demanding goal and the language of the course that sets it.
 */
async function findCandidates(organizationId: string): Promise<Candidate[]> {
  const periods = await prisma.assignmentRecipient.findMany({
    orderBy: { assignment: { minDailySeconds: "desc" } },
    select: {
      assignment: { select: { course: { select: { language: true } }, minDailySeconds: true } },
      userId: true,
    },
    where: {
      assignment: { minDailySeconds: { not: null }, organizationId },
      memberId: { not: null },
      removedAt: null,
    },
  });

  const firstByUser = Map.groupBy(periods, (period) => period.userId);

  return [...firstByUser.entries()].flatMap(([userId, [strictest]]) =>
    strictest?.assignment.minDailySeconds
      ? [
          {
            goalSeconds: strictest.assignment.minDailySeconds,
            language: strictest.assignment.course.language,
            userId,
          },
        ]
      : [],
  );
}

/**
 * Keeps only learners who still have today's goal ahead of them, were not
 * reminded today, and turned reminders on somewhere.
 */
async function selectRecipients({ candidates, date }: { candidates: Candidate[]; date: Date }) {
  const userIds = candidates.map((candidate) => candidate.userId);

  const [progress, deliveries, subscriptions] = await Promise.all([
    prisma.dailyProgress.findMany({ where: { date, userId: { in: userIds } } }),
    prisma.reminderDelivery.findMany({ where: { date, userId: { in: userIds } } }),
    prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } }),
  ]);

  const secondsByUser = new Map(progress.map((row) => [row.userId, row.timeSpentSeconds]));
  const remindedToday = new Set(deliveries.map((row) => row.userId));
  const subscriptionsByUser = Map.groupBy(subscriptions, (row) => row.userId);

  return candidates.flatMap((candidate) => {
    const userSubscriptions = subscriptionsByUser.get(candidate.userId) ?? [];
    const goalMet = (secondsByUser.get(candidate.userId) ?? 0) >= candidate.goalSeconds;

    if (goalMet || remindedToday.has(candidate.userId) || userSubscriptions.length === 0) {
      return [];
    }

    return [{ ...candidate, subscriptions: userSubscriptions }];
  });
}

/**
 * The delivery row is claimed before anything is sent. Its unique key is what
 * keeps a learner in two organizations, or a sender that runs twice, from
 * reminding anyone more than once a day.
 */
async function claimDelivery({ date, userId }: { date: Date; userId: string }) {
  const { error } = await safeAsync(() =>
    prisma.reminderDelivery.create({ data: { date, userId } }),
  );

  if (isPrismaUniqueConstraintError(error)) {
    return false;
  }

  if (error) {
    throw error;
  }

  return true;
}

/** Returns whether the push service reported the subscription as gone. */
async function push({
  message,
  subscription,
  vapid,
}: {
  message: ReminderMessage;
  subscription: Subscription;
  vapid: VapidDetails;
}): Promise<boolean> {
  const { error } = await safeAsync(() =>
    webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { auth: subscription.auth, p256dh: subscription.p256dh },
      },
      JSON.stringify({ ...message, url: "/my" }),
      { TTL: PUSH_TIME_TO_LIVE_SECONDS, vapidDetails: vapid },
    ),
  );

  return error instanceof webPush.WebPushError && EXPIRED_SUBSCRIPTION_STATUS.has(error.statusCode);
}

/**
 * Sends the reminders that are due at `now` and reports what happened.
 *
 * This is a system job with no signed-in caller: the delivery app runs it on a
 * schedule and authenticates the scheduler itself. Message copy stays with that
 * app, which owns translations, so it is passed in per language.
 */
export async function sendDueReminders({
  composeMessage,
  now,
  vapid,
}: {
  composeMessage: (input: { language: string }) => Promise<ReminderMessage>;
  now: Date;
  vapid: VapidDetails;
}) {
  const schedules = await prisma.organizationReminderSchedule.findMany();

  const dueSchedules = schedules.filter(
    (schedule) =>
      isValidTimeZone(schedule.timeZone) &&
      isReminderDue({ hour: schedule.hour, now, timeZone: schedule.timeZone }),
  );

  const outcomes = await Promise.all(
    dueSchedules.map(async (schedule) => {
      const { date } = getReminderClock({ now, timeZone: schedule.timeZone });
      const candidates = await findCandidates(schedule.organizationId);
      const recipients = await selectRecipients({ candidates, date });

      return Promise.all(
        recipients.map(async (recipient) => {
          if (!(await claimDelivery({ date, userId: recipient.userId }))) {
            return { expired: [], sent: 0 };
          }

          const message = await composeMessage({ language: recipient.language });

          const gone = await Promise.all(
            recipient.subscriptions.map((subscription) => push({ message, subscription, vapid })),
          );

          return {
            expired: recipient.subscriptions.filter((_, index) => gone[index]).map((row) => row.id),
            sent: 1,
          };
        }),
      );
    }),
  );

  const results = outcomes.flat();
  const expiredIds = results.flatMap((result) => result.expired);

  await Promise.all([
    prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } }),
    prisma.reminderDelivery.deleteMany({
      where: { date: { lt: new Date(now.getTime() - DELIVERY_RETENTION_DAYS * DAY_MS) } },
    }),
  ]);

  return {
    expiredSubscriptions: expiredIds.length,
    reminded: results.reduce((total, result) => total + result.sent, 0),
  };
}
