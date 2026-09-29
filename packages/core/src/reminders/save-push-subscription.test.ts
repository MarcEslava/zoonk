import { randomUUID } from "node:crypto";
import { prisma } from "@zoonk/db";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { deletePushSubscription, savePushSubscription } from "./save-push-subscription";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

function subscription() {
  return {
    auth: "auth-secret",
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
    p256dh: "public-key",
  };
}

describe(savePushSubscription, () => {
  beforeEach(() => mockSession(null));

  it("refuses a guest", async () => {
    await expect(savePushSubscription(subscription())).resolves.toStrictEqual({
      status: "unauthorized",
    });
  });

  it("saves the browser for the signed-in learner", async () => {
    const learner = await userFixture();
    const input = subscription();

    mockSession(learner.id);

    await expect(savePushSubscription(input)).resolves.toStrictEqual({ status: "saved" });

    await expect(
      prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } }),
    ).resolves.toMatchObject({ userId: learner.id });
  });

  it("moves a browser to whoever signs in on it next", async () => {
    const [first, second] = await Promise.all([userFixture(), userFixture()]);
    const input = subscription();

    mockSession(first.id);
    await savePushSubscription(input);

    mockSession(second.id);
    await savePushSubscription(input);

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint: input.endpoint } });

    expect(rows.map((row) => row.userId)).toStrictEqual([second.id]);
  });

  it("refuses an endpoint that is not a push service", async () => {
    const learner = await userFixture();

    mockSession(learner.id);

    await expect(
      savePushSubscription({ ...subscription(), endpoint: "https://169.254.169.254/latest" }),
    ).resolves.toStrictEqual({ status: "invalidSubscription" });
  });
});

describe(deletePushSubscription, () => {
  beforeEach(() => mockSession(null));

  it("removes only the signed-in learner's own browser", async () => {
    const [owner, stranger] = await Promise.all([userFixture(), userFixture()]);
    const input = subscription();

    mockSession(owner.id);
    await savePushSubscription(input);

    mockSession(stranger.id);
    await deletePushSubscription({ endpoint: input.endpoint });

    await expect(
      prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } }),
    ).resolves.toMatchObject({ userId: owner.id });

    mockSession(owner.id);
    await deletePushSubscription({ endpoint: input.endpoint });

    await expect(
      prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } }),
    ).resolves.toBeNull();
  });
});
