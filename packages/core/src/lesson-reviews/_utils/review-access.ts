import "server-only";
import { prisma } from "@zoonk/db";
import { getOrganizationAccess } from "../../organizations/get-organization-access";
import { getSession } from "../../users/get-session";

const REVIEW_PERMISSIONS = { course: ["update"] } as const;

/**
 * Authorizes reviewing one lesson of an organization's own curriculum.
 *
 * The session is checked before the lesson is looked up, so a guest is told to
 * sign in rather than whether a lesson exists. Lessons outside any
 * organization, and organizations the caller does not belong to, both read as
 * not found.
 */
export async function getLessonReviewAccess(lessonId: string) {
  const session = await getSession();

  if (!session) {
    return { status: "unauthorized" as const };
  }

  const lesson = await prisma.lesson.findUnique({
    include: { chapter: { include: { course: true } } },
    where: { id: lessonId },
  });

  const organizationId = lesson?.chapter.course.organizationId;

  if (!lesson || !organizationId) {
    return { status: "notFound" as const };
  }

  const access = await getOrganizationAccess({ organizationId, permissions: REVIEW_PERMISSIONS });

  if (access.status !== "ready") {
    return access;
  }

  return { lesson, status: "ready" as const, userId: access.membership.userId };
}

/** Authorizes reviewing the lesson that owns one step. */
export async function getStepReviewAccess(stepId: string) {
  const step = await prisma.step.findUnique({ include: { draft: true }, where: { id: stepId } });

  if (!step) {
    const session = await getSession();
    return { status: session ? ("notFound" as const) : ("unauthorized" as const) };
  }

  const access = await getLessonReviewAccess(step.lessonId);

  if (access.status !== "ready") {
    return access;
  }

  return { ...access, step };
}
