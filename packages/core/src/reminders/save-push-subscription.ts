import "server-only";
import { prisma } from "@zoonk/db";
import { getSession } from "../users/get-session";
import { isAllowedPushEndpoint } from "./_utils/push-endpoint";

/**
 * Turns reminders on for the signed-in learner on the browser that sent this
 * subscription.
 *
 * An endpoint identifies a browser, not a person, so saving it again from a
 * different account moves it to that account: whoever is signed in on a device
 * is the one who gets its reminders.
 */
export async function savePushSubscription({
  auth,
  endpoint,
  p256dh,
}: {
  auth: string;
  endpoint: string;
  p256dh: string;
}) {
  const session = await getSession();

  if (!session) {
    return { status: "unauthorized" as const };
  }

  if (!auth || !p256dh || !isAllowedPushEndpoint(endpoint)) {
    return { status: "invalidSubscription" as const };
  }

  await prisma.pushSubscription.upsert({
    create: { auth, endpoint, p256dh, userId: session.user.id },
    update: { auth, p256dh, userId: session.user.id },
    where: { endpoint },
  });

  return { status: "saved" as const };
}

/**
 * Turns reminders off on one browser. Only the signed-in learner's own
 * subscription can be removed, so knowing another device's endpoint is not
 * enough to silence it.
 */
export async function deletePushSubscription({ endpoint }: { endpoint: string }) {
  const session = await getSession();

  if (!session) {
    return { status: "unauthorized" as const };
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });

  return { status: "deleted" as const };
}
