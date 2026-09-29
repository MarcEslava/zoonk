import { Link } from "@/i18n/navigation";
import { listCurrentUserAssignments } from "@zoonk/core/organizations/list-current-user-assignments";
import {
  ListGroup,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemIcon,
  ListItemTitle,
} from "@zoonk/ui/components/list";
import { ClipboardCheckIcon } from "lucide-react";
import { getExtracted, getFormatter } from "next-intl/server";

/**
 * What an organization requires comes before what the learner chose to start,
 * and only appears when there is something to show: most learners belong to no
 * organization and should see the page exactly as before.
 */
export async function AssignedCourseList() {
  const t = await getExtracted();
  const format = await getFormatter();
  const assignments = await listCurrentUserAssignments();

  const reachable = assignments.flatMap((assignment) =>
    assignment.organization ? [{ ...assignment, organization: assignment.organization }] : [],
  );

  if (reachable.length === 0) {
    return null;
  }

  return (
    <section aria-label={t("Assigned to you")} className="flex flex-col gap-3">
      <h2 className="px-4 font-medium">{t("Assigned to you")}</h2>

      <ListGroup>
        {reachable.map((assignment) => (
          <ListItem className="gap-0 p-0" key={assignment.id}>
            <Link
              className="focus-visible:ring-ring/50 hover:bg-muted flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl px-4 py-2.5 transition-colors outline-none focus-visible:ring-[3px]"
              href={`/b/${assignment.organization.slug}/c/${assignment.course.slug}` as const}
              prefetch
            >
              <ListItemIcon>
                <ClipboardCheckIcon
                  aria-hidden="true"
                  className="text-muted-foreground/80 size-6"
                />
              </ListItemIcon>

              <ListItemContent>
                <ListItemTitle>{assignment.course.title}</ListItemTitle>
                <ListItemDescription>
                  {[
                    assignment.organization.name,
                    assignment.minDailySeconds !== null &&
                      t("{minutes, number} min/day", { minutes: assignment.minDailySeconds / 60 }),
                    assignment.dueAt &&
                      t("Due {date}", {
                        date: format.dateTime(assignment.dueAt, {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        }),
                      }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </ListItemDescription>
              </ListItemContent>
            </Link>
          </ListItem>
        ))}
      </ListGroup>
    </section>
  );
}
