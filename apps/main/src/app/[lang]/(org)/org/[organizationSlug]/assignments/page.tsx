import { listAssignableCourses } from "@zoonk/core/organizations/list-assignable-courses";
import { listOrganizationAssignments } from "@zoonk/core/organizations/list-assignments";
import { listOrganizationMembers } from "@zoonk/core/organizations/list-members";
import { listOrganizationTags } from "@zoonk/core/organizations/list-tags";
import { getOrganizationReminderSchedule } from "@zoonk/core/organizations/reminder-schedule";
import {
  REMINDER_EARLIEST_HOUR,
  REMINDER_LATEST_HOUR,
} from "@zoonk/core/organizations/reminder-schedule-contract";
import {
  Container,
  ContainerBody,
  ContainerDescription,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@zoonk/ui/components/item";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { EmptyView } from "@zoonk/ui/patterns/empty";
import { BookOpenIcon } from "lucide-react";
import { type Metadata } from "next";
import { getExtracted, getFormatter } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findOrganization } from "../_utils/find-organization";
import { AssignCourseForm } from "./assign-course-form";
import { ReminderScheduleForm } from "./reminder-schedule-form";

type AssignmentRow = Extract<
  Awaited<ReturnType<typeof listOrganizationAssignments>>,
  { status: "ready" }
>["assignments"][number];

const REMINDER_HOURS = Array.from(
  { length: REMINDER_LATEST_HOUR - REMINDER_EARLIEST_HOUR + 1 },
  (_, index) => REMINDER_EARLIEST_HOUR + index,
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted();

  return { title: t("Assignments") };
}

async function AssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
  const t = await getExtracted();
  const format = await getFormatter();

  if (assignments.length === 0) {
    return null;
  }

  return (
    <section aria-label={t("Current assignments")} className="flex flex-col gap-3">
      <h2 className="font-medium">{t("Current assignments")}</h2>

      <ItemGroup className="divide-y">
        {assignments.map((assignment) => (
          <Item className="rounded-none px-0" key={assignment.id}>
            <ItemContent>
              <ItemTitle>{assignment.course.title}</ItemTitle>
              <ItemDescription>
                {[...assignment.targetTags, ...assignment.targetMembers].join(", ")}
              </ItemDescription>
              <ItemDescription>
                {t("{count, plural, one {Reaches # person} other {Reaches # people}}", {
                  count: assignment.openRecipientCount,
                })}
                {assignment.minDailySeconds !== null &&
                  ` · ${t("{minutes, number} min/day", { minutes: assignment.minDailySeconds / 60 })}`}
                {assignment.dueAt &&
                  ` · ${t("Due {date}", {
                    date: format.dateTime(assignment.dueAt, {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }),
                  })}`}
              </ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}

async function AssignmentsContent({
  params,
}: Pick<PageProps<"/[lang]/org/[organizationSlug]/assignments">, "params">) {
  const { organizationSlug } = await params;
  const membership = await findOrganization(organizationSlug);

  if (!membership) {
    notFound();
  }

  const organizationId = membership.organization.id;
  const t = await getExtracted();

  const [assignable, team, vocabulary, current, reminders] = await Promise.all([
    listAssignableCourses({ organizationId }),
    listOrganizationMembers({ organizationId }),
    listOrganizationTags({ organizationId }),
    listOrganizationAssignments({ organizationId }),
    getOrganizationReminderSchedule({ organizationId }),
  ]);

  if (
    assignable.status !== "ready" ||
    team.status !== "ready" ||
    vocabulary.status !== "ready" ||
    current.status !== "ready"
  ) {
    notFound();
  }

  const { courses } = assignable;
  const { members } = team;
  const { tags } = vocabulary;

  return (
    <div className="flex flex-col gap-10">
      {courses.length === 0 ? (
        <EmptyView
          description={t("Publish a course in this organization to assign it to your team.")}
          icon={BookOpenIcon}
          title={t("No courses to assign")}
        />
      ) : (
        <AssignCourseForm
          courses={courses}
          members={members}
          organizationId={organizationId}
          tags={tags}
        />
      )}

      <AssignmentList assignments={current.assignments} />

      {reminders.status === "ready" && (
        <ReminderScheduleForm
          hours={REMINDER_HOURS}
          organizationId={organizationId}
          schedule={reminders.schedule}
          timeZones={Intl.supportedValuesOf("timeZone")}
        />
      )}
    </div>
  );
}

export default async function OrganizationAssignmentsPage({
  params,
}: PageProps<"/[lang]/org/[organizationSlug]/assignments">) {
  const t = await getExtracted();

  return (
    <Container>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <ContainerTitle>{t("Assignments")}</ContainerTitle>
          <ContainerDescription>
            {t("Require a course from part of your team, with a daily target and a deadline.")}
          </ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <AssignmentsContent params={params} />
        </Suspense>
      </ContainerBody>
    </Container>
  );
}
