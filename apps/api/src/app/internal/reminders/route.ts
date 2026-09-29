import { timingSafeEqual } from "node:crypto";
import { errors } from "@/lib/api-errors";
import { sendDueReminders } from "@zoonk/core/reminders/internal/send-due-reminders";
import { DEFAULT_LOCALE, getContentLocale } from "@zoonk/utils/locale";
import { getExtracted } from "next-intl/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * The scheduler's trigger for weekday reminders. Vercel Cron calls it every
 * hour with the project's CRON_SECRET as a bearer token, and the sender decides
 * which organizations are due in their own time zone.
 *
 * It sits outside /v1 and the OpenAPI document on purpose: it is not a product
 * capability any client could use, only the entry point of a system job. It
 * reads no cookies, so it carries no cross-site request risk.
 */

/** Constant-time comparison, so response timing reveals nothing about the secret. */
function isScheduler(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || !header) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

function getVapidDetails() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const subject = process.env.VAPID_SUBJECT;

  return privateKey && publicKey && subject ? { privateKey, publicKey, subject } : null;
}

/** Reminders speak the language of the training they are about. */
async function composeMessage({ language }: { language: string }) {
  const t = await getExtracted({ locale: getContentLocale(language) ?? DEFAULT_LOCALE });

  return {
    body: t("A few minutes today keep your weekly habit going."),
    title: t("Time for today's training"),
  };
}

export async function GET(request: NextRequest) {
  if (!isScheduler(request)) {
    return errors.unauthorized();
  }

  const vapid = getVapidDetails();

  if (!vapid) {
    return errors.internal("Reminders are not configured");
  }

  const result = await sendDueReminders({ composeMessage, now: new Date(), vapid });

  return NextResponse.json(result);
}
