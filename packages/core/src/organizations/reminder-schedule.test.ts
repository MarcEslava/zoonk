import { prisma } from "@zoonk/db";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import {
  getOrganizationReminderSchedule,
  setOrganizationReminderSchedule,
} from "./reminder-schedule";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

async function signedInAs(role: string) {
  const [user, organization] = await Promise.all([
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  await organizationMemberFixture({ organizationId: organization.id, role, userId: user.id });
  mockSession(user.id);

  return { organizationId: organization.id };
}

const MADRID_AT_TEN = { hour: 10, timeZone: "Europe/Madrid" };

describe(setOrganizationReminderSchedule, () => {
  beforeEach(() => mockSession(null));

  it("refuses a plain member", async () => {
    const { organizationId } = await signedInAs("member");

    await expect(
      setOrganizationReminderSchedule({ organizationId, schedule: MADRID_AT_TEN }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("lets an admin choose a weekday hour in the organization's time zone", async () => {
    const { organizationId } = await signedInAs("admin");

    await setOrganizationReminderSchedule({ organizationId, schedule: MADRID_AT_TEN });

    await expect(getOrganizationReminderSchedule({ organizationId })).resolves.toMatchObject({
      schedule: { hour: 10, timeZone: "Europe/Madrid" },
    });
  });

  it("refuses an hour outside the working day", async () => {
    const { organizationId } = await signedInAs("owner");

    await expect(
      setOrganizationReminderSchedule({ organizationId, schedule: { ...MADRID_AT_TEN, hour: 22 } }),
    ).resolves.toStrictEqual({ status: "invalidSchedule" });
  });

  it("refuses a time zone that does not exist", async () => {
    const { organizationId } = await signedInAs("owner");

    await expect(
      setOrganizationReminderSchedule({
        organizationId,
        schedule: { ...MADRID_AT_TEN, timeZone: "Mars/Base" },
      }),
    ).resolves.toStrictEqual({ status: "invalidSchedule" });
  });

  it("removes the schedule when reminders are turned off", async () => {
    const { organizationId } = await signedInAs("owner");

    await setOrganizationReminderSchedule({ organizationId, schedule: MADRID_AT_TEN });
    await setOrganizationReminderSchedule({ organizationId, schedule: null });

    await expect(
      prisma.organizationReminderSchedule.findUnique({ where: { organizationId } }),
    ).resolves.toBeNull();
  });
});
