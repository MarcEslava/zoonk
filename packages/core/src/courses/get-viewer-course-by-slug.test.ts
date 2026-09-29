import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { getViewerCourse } from "./get-viewer-course-by-slug";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

async function organizationCourseFixture() {
  const [member, outsider, organization] = await Promise.all([
    userFixture(),
    userFixture(),
    organizationFixture({ kind: "school" }),
  ]);

  const [, course] = await Promise.all([
    organizationMemberFixture({ organizationId: organization.id, userId: member.id }),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const params = { brandSlug: organization.slug, courseSlug: course.slug };

  return { course, member, outsider, params };
}

describe(getViewerCourse, () => {
  beforeEach(() => mockSession(null));

  it("serves a public brand course to a guest", async () => {
    const brand = await organizationFixture({ kind: "brand" });
    const course = await courseFixture({ isPublished: true, organizationId: brand.id });

    await expect(
      getViewerCourse({ brandSlug: brand.slug, courseSlug: course.slug }),
    ).resolves.toMatchObject({ id: course.id });
  });

  it("serves an organization course to one of its members", async () => {
    const { course, member, params } = await organizationCourseFixture();

    mockSession(member.id);

    await expect(getViewerCourse(params)).resolves.toMatchObject({ id: course.id });
  });

  it("hides an organization course from someone outside it", async () => {
    const { outsider, params } = await organizationCourseFixture();

    mockSession(outsider.id);

    await expect(getViewerCourse(params)).resolves.toBeNull();
  });

  it("hides an organization course from a guest", async () => {
    const { params } = await organizationCourseFixture();

    await expect(getViewerCourse(params)).resolves.toBeNull();
  });
});
