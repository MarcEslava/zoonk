/**
 * Shows the reminders the Zoonk API sends and opens My Courses when one is
 * tapped. It deliberately caches nothing and never serves pages offline, so
 * installing the app changes only where reminders arrive.
 *
 * It is registered as a module worker, so its declarations stay in module
 * scope instead of leaking onto the worker's global object.
 */

const FALLBACK_PATH = "/my";

/** One tag means a new reminder replaces an unread one instead of piling up. */
export const REMINDER_TAG = "daily-reminder";

/**
 * Only same-origin paths are opened, so even a malformed payload cannot send
 * the learner to another site from a notification.
 */
function toSameOriginUrl(path) {
  const { origin } = globalThis.location;
  const url = new URL(typeof path === "string" ? path : FALLBACK_PATH, origin);

  return url.origin === origin ? url.href : new URL(FALLBACK_PATH, origin).href;
}

globalThis.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};

  event.waitUntil(
    globalThis.registration.showNotification(payload.title || "Zoonk", {
      body: payload.body,
      data: { url: toSameOriginUrl(payload.url) },
      icon: "/apple-icon.png",
      tag: REMINDER_TAG,
    }),
  );
});

globalThis.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(globalThis.clients.openWindow(toSameOriginUrl(event.notification.data?.url)));
});
