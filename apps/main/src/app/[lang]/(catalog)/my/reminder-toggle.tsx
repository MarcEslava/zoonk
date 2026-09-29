"use client";

import { Button } from "@zoonk/ui/components/button";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { disableRemindersAction, enableRemindersAction } from "./_actions/reminders";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SERVICE_WORKER_PATH = "/sw.js";

/** Base64 encodes every three bytes as four characters, padding the last group. */
const BASE64_GROUP_LENGTH = 4;

type ReminderState = "checking" | "unsupported" | "installRequired" | "blocked" | "off" | "on";

/** VAPID keys are base64url text; the Push API wants their raw bytes. */
function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const groups = Math.ceil(base64.length / BASE64_GROUP_LENGTH);
  const padded = base64.padEnd(groups * BASE64_GROUP_LENGTH, "=");

  return Uint8Array.from(atob(padded), (character) => character.codePointAt(0) ?? 0);
}

/**
 * iPhone and iPad only expose the Push API to a site added to the home screen,
 * so a missing API there means "install first" rather than "not possible".
 */
function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/u.test(navigator.userAgent);
}

async function findSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  return registration?.pushManager.getSubscription() ?? null;
}

async function readReminderState(): Promise<ReminderState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in globalThis)) {
    return isAppleMobile() ? "installRequired" : "unsupported";
  }

  if (Notification.permission === "denied") {
    return "blocked";
  }

  return (await findSubscription()) ? "on" : "off";
}

async function subscribe(publicKey: string): Promise<ReminderState> {
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return permission === "denied" ? "blocked" : "off";
  }

  await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { type: "module" });
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: decodeBase64Url(publicKey),
    userVisibleOnly: true,
  });

  const { keys } = subscription.toJSON();

  const status = await enableRemindersAction({
    auth: keys?.auth,
    endpoint: subscription.endpoint,
    p256dh: keys?.p256dh,
  });

  if (status !== "saved") {
    await subscription.unsubscribe();
    return "off";
  }

  return "on";
}

async function unsubscribe(): Promise<ReminderState> {
  const subscription = await findSubscription();

  if (subscription) {
    await disableRemindersAction(subscription.endpoint);
    await subscription.unsubscribe();
  }

  return "off";
}

/**
 * Lets a learner turn weekday reminders on or off for this browser. The state
 * lives in the browser's push registration, so it is read from there once the
 * component reaches the client.
 */
export function ReminderToggle() {
  const t = useExtracted();
  const [state, setState] = useState<ReminderState>("checking");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void readReminderState().then(setState);
  }, []);

  if (!VAPID_PUBLIC_KEY || state === "checking" || state === "unsupported") {
    return null;
  }

  if (state === "installRequired") {
    return (
      <p className="text-muted-foreground text-xs">
        {t("To get reminders on iPhone, add Zoonk to your home screen from the Share menu.")}
      </p>
    );
  }

  if (state === "blocked") {
    return (
      <p className="text-muted-foreground text-xs">
        {t(
          "Notifications are blocked for Zoonk. Allow them in your browser settings to get reminders.",
        )}
      </p>
    );
  }

  const toggle = () =>
    startTransition(async () => {
      setState(state === "on" ? await unsubscribe() : await subscribe(VAPID_PUBLIC_KEY));
    });

  return (
    <Button
      className="self-start"
      disabled={isPending}
      onClick={toggle}
      size="sm"
      variant="outline"
    >
      {state === "on" ? <BellOffIcon /> : <BellIcon />}
      {state === "on" ? t("Stop reminders") : t("Remind me on weekdays")}
    </Button>
  );
}
