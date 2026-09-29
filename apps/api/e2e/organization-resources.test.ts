import { request } from "@playwright/test";
import { prisma } from "@zoonk/db";
import { expect, test } from "@zoonk/e2e/fixtures";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { createAuthenticatedApiContext } from "./helpers/auth";

const LEARNER_ENDPOINTS = ["/v1/me/organizations", "/v1/me/assignments", "/v1/me/habit"];
const DAILY_GOAL_SECONDS = 180;

function getBaseURL() {
  return process.env.E2E_BASE_URL ?? "";
}

/**
 * Puts a fresh signed-in learner in a school organization that requires one of
 * its courses, the way the organization screen would after an assignment.
 */
async function assignedLearnerFixture() {
  const [auth, organization] = await Promise.all([
    createAuthenticatedApiContext({ baseURL: getBaseURL(), prefix: "org-learner" }),
    organizationFixture({ kind: "school" }),
  ]);

  const [member, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, userId: auth.user.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      createdById: auth.user.id,
      minDailySeconds: DAILY_GOAL_SECONDS,
      organizationId: organization.id,
      recipients: { create: { memberId: member.id, userId: auth.user.id } },
    },
  });

  return { ...auth, assignment, course, organization };
}

test.describe("Organization learner resources", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("rejects guests on every learner organization resource", async () => {
    const apiContext = await request.newContext({ baseURL: getBaseURL() });

    const responses = await Promise.all(
      LEARNER_ENDPOINTS.map((endpoint) => apiContext.get(endpoint)),
    );

    for (const response of responses) {
      expect(response.status()).toBe(401);
    }

    await apiContext.dispose();
  });

  test("returns a learner's organizations, assignments, and own habit", async () => {
    const { apiContext, assignment, course, organization } = await assignedLearnerFixture();

    const [organizations, assignments, habit] = await Promise.all(
      LEARNER_ENDPOINTS.map((endpoint) => apiContext.get(endpoint)),
    );

    expect(await organizations?.json()).toEqual({
      data: [
        {
          organization: {
            id: organization.id,
            logo: organization.logo,
            name: organization.name,
            slug: organization.slug,
          },
          role: "member",
        },
      ],
    });

    expect(await assignments?.json()).toMatchObject({
      data: [
        {
          course: { id: course.id, slug: course.slug, title: course.title },
          dueAt: null,
          id: assignment.id,
          minDailySeconds: DAILY_GOAL_SECONDS,
          organization: { id: organization.id },
        },
      ],
    });

    expect(await habit?.json()).toMatchObject({
      habit: { dailyGoalSeconds: DAILY_GOAL_SECONDS, todaySeconds: 0, weekMetDays: 0 },
    });

    await apiContext.dispose();
  });

  test("returns empty resources for a learner outside any organization", async () => {
    const { apiContext } = await createAuthenticatedApiContext({
      baseURL: getBaseURL(),
      prefix: "org-outsider",
    });

    const [organizations, assignments, habit] = await Promise.all(
      LEARNER_ENDPOINTS.map((endpoint) => apiContext.get(endpoint)),
    );

    expect(await organizations?.json()).toEqual({ data: [] });
    expect(await assignments?.json()).toEqual({ data: [] });
    expect(await habit?.json()).toEqual({ habit: null });

    await apiContext.dispose();
  });
});
