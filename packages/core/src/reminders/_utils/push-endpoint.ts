/**
 * Push services browsers deliver through. The sender posts to whatever
 * endpoint a browser registered, so accepting any URL would let someone point
 * the server at an internal address; only these hosts are ever contacted.
 */
const PUSH_SERVICE_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

/** Edge delivers through regional Windows Notification Service hosts. */
const PUSH_SERVICE_HOST_SUFFIXES = [".notify.windows.com"];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (!URL.canParse(endpoint)) {
    return false;
  }

  const url = new URL(endpoint);

  if (url.protocol !== "https:") {
    return false;
  }

  return (
    PUSH_SERVICE_HOSTS.has(url.hostname) ||
    PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
  );
}
