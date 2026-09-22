import "server-only";
import { cacheAdminData } from "@/data/_utils/admin-data-cache";
import { prisma } from "@zoonk/db";

/**
 * The editor needs the owning lesson and chapter only to show an admin which
 * curriculum a step belongs to before they change learner-facing content.
 */
export const getStep = cacheAdminData((id: string) =>
  prisma.step.findUnique({
    include: { lesson: { include: { chapter: { include: { course: true } } } } },
    where: { id },
  }),
);
