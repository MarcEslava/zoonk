import { request } from "@playwright/test";
import { prisma } from "@zoonk/db";
import { expect, test } from "@zoonk/e2e/fixtures";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { createAuthenticatedApiContext } from "./helpers/auth";

const DAILY_GOAL_SECONDS = 180;
const HTTP_CREATED = 201;

function getBaseURL() {
  return process.env.E2E_BASE_URL ?? "";
}

/**
 * A school organization whose signed-in caller has the given role, with a
 * published course to assign and a teammate who carries no segment yet.
 */
async function organizationFixtureAs(role: string) {
  const [auth, organization, teammate] = await Promise.all([
    createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: `org-${role}` }),
    organizationFixture({ kind: "school" }),
    userFixture(),
  ]);

  const [, teammateMember, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, role, userId: auth.user.id }),
    organizationMemberFixture({ organizationId: organization.id, userId: teammate.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  return { ...auth, course, organization, teammateMember };
}

test.describe("Organization management resources", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("refuses guests, outsiders, and plain members", async () => {
    const [{ apiContext: memberContext, organization }, outsider] = await Promise.all([
      organizationFixtureAs("member"),
      createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: "org-outsider" }),
    ]);

    const guestContext = await request.newContext({ baseURL: getBaseURL() });
    const endpoint = `/v1/organizations/${organization.id}/members`;

    const [guest, stranger, member] = await Promise.all([
      guestContext.get(endpoint),
      outsider.apiContext.get(endpoint),
      memberContext.get(endpoint),
    ]);

    expect(guest.status()).toBe(401);
    expect(stranger.status()).toBe(404);
    expect(member.status()).toBe(403);

    await Promise.all([
      guestContext.dispose(),
      outsider.apiContext.dispose(),
      memberContext.dispose(),
    ]);
  });

  test("an owner segments the team and assigns a course to a segment", async () => {
    const { apiContext, course, organization, teammateMember } =
      await organizationFixtureAs("owner");

    const base = `/v1/organizations/${organization.id}`;

    const created = await apiContext.post(`${base}/tags`, { data: { name: " Funcio : MSL " } });

    expect(created.status()).toBe(HTTP_CREATED);

    const tag = await created.json();

    expect(tag).toMatchObject({ name: "funcio:msl" });

    const duplicate = await apiContext.post(`${base}/tags`, { data: { name: "funcio:msl" } });

    expect(duplicate.status()).toBe(409);

    const assigned = await apiContext.post(`${base}/assignments`, {
      data: { courseId: course.id, minDailySeconds: DAILY_GOAL_SECONDS, tagIds: [tag.id] },
    });

    expect(assigned.status()).toBe(HTTP_CREATED);
    expect(await assigned.json()).toMatchObject({ recipientCount: 0 });

    const tagged = await apiContext.put(`/v1/organization-members/${teammateMember.id}/tags`, {
      data: { tagIds: [tag.id] },
    });

    expect(await tagged.json()).toStrictEqual({ reconciledAssignments: 1 });

    const [members, assignments, assignable] = await Promise.all([
      apiContext.get(`${base}/members`),
      apiContext.get(`${base}/assignments`),
      apiContext.get(`${base}/assignable-courses`),
    ]);

    expect(await members.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ id: teammateMember.id, tags: [{ id: tag.id, name: tag.name }] }),
      ]),
    });

    expect(await assignments.json()).toMatchObject({
      data: [
        {
          course: { id: course.id },
          minDailySeconds: DAILY_GOAL_SECONDS,
          openRecipientCount: 1,
          targetTags: [tag.name],
        },
      ],
    });

    expect(await assignable.json()).toMatchObject({ data: [{ id: course.id }] });

    await apiContext.dispose();
  });

  test("an owner sets reminders only inside the working day", async () => {
    const { apiContext, organization } = await organizationFixtureAs("owner");
    const endpoint = `/v1/organizations/${organization.id}/reminder-schedule`;

    const evening = await apiContext.put(endpoint, {
      data: { hour: 22, timeZone: "Europe/Madrid" },
    });

    expect(evening.status()).toBe(400);

    const saved = await apiContext.put(endpoint, { data: { hour: 11, timeZone: "Europe/Madrid" } });

    expect(await saved.json()).toStrictEqual({ schedule: { hour: 11, timeZone: "Europe/Madrid" } });

    const removed = await apiContext.delete(endpoint);

    expect(removed.status()).toBe(204);

    const current = await apiContext.get(endpoint);

    expect(await current.json()).toStrictEqual({ schedule: null });

    await apiContext.dispose();
  });
});
