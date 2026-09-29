"use server";

import {
  deletePushSubscription,
  savePushSubscription,
} from "@zoonk/core/reminders/push-subscription";

/** Values arrive from the browser, so their types are checked rather than trusted. */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function enableRemindersAction(subscription: {
  auth: unknown;
  endpoint: unknown;
  p256dh: unknown;
}) {
  const result = await savePushSubscription({
    auth: asString(subscription.auth),
    endpoint: asString(subscription.endpoint),
    p256dh: asString(subscription.p256dh),
  });

  return result.status;
}

export async function disableRemindersAction(endpoint: unknown) {
  const result = await deletePushSubscription({ endpoint: asString(endpoint) });
  return result.status;
}
