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

const MADRID_AT_TEN = { hour: 10, schedule: "on" as const, timeZone: "Europe/Madrid" };

describe(setOrganizationReminderSchedule, () => {
  beforeEach(() => mockSession(null));

  it("refuses a plain member", async () => {
    const { organizationId } = await signedInAs("member");

    await expect(
      setOrganizationReminderSchedule({ ...MADRID_AT_TEN, organizationId }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("lets an admin choose a weekday hour in the organization's time zone", async () => {
    const { organizationId } = await signedInAs("admin");

    await setOrganizationReminderSchedule({ ...MADRID_AT_TEN, organizationId });

    await expect(getOrganizationReminderSchedule({ organizationId })).resolves.toMatchObject({
      schedule: { hour: 10, timeZone: "Europe/Madrid" },
    });
  });

  it("refuses an hour outside the working day", async () => {
    const { organizationId } = await signedInAs("owner");

    await expect(
      setOrganizationReminderSchedule({ ...MADRID_AT_TEN, hour: 22, organizationId }),
    ).resolves.toStrictEqual({ status: "invalidSchedule" });
  });

  it("refuses a time zone that does not exist", async () => {
    const { organizationId } = await signedInAs("owner");

    await expect(
      setOrganizationReminderSchedule({ ...MADRID_AT_TEN, organizationId, timeZone: "Mars/Base" }),
    ).resolves.toStrictEqual({ status: "invalidSchedule" });
  });

  it("removes the schedule when reminders are turned off", async () => {
    const { organizationId } = await signedInAs("owner");

    await setOrganizationReminderSchedule({ ...MADRID_AT_TEN, organizationId });
    await setOrganizationReminderSchedule({ ...MADRID_AT_TEN, organizationId, schedule: "off" });

    await expect(
      prisma.organizationReminderSchedule.findUnique({ where: { organizationId } }),
    ).resolves.toBeNull();
  });
});
