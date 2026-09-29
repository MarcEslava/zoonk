import { Link } from "@/i18n/navigation";
import { listReviewCourses } from "@zoonk/core/lesson-reviews/list-review-courses";
import { Badge } from "@zoonk/ui/components/badge";
import {
  Container,
  ContainerBody,
  ContainerDescription,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@zoonk/ui/components/item";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { EmptyView } from "@zoonk/ui/patterns/empty";
import { BookOpenIcon } from "lucide-react";
import { type Metadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findOrganization } from "../_utils/find-organization";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted();

  return { title: t("Courses") };
}

async function CourseList({
  params,
}: Pick<PageProps<"/[lang]/org/[organizationSlug]/courses">, "params">) {
  const { organizationSlug } = await params;
  const membership = await findOrganization(organizationSlug);

  if (!membership) {
    notFound();
  }

  const result = await listReviewCourses({ organizationId: membership.organization.id });
  const t = await getExtracted();

  if (result.status !== "ready") {
    notFound();
  }

  if (result.courses.length === 0) {
    return (
      <EmptyView
        description={t("Courses your organization owns appear here for review.")}
        icon={BookOpenIcon}
        title={t("No courses yet")}
      />
    );
  }

  return (
    <ItemGroup className="divide-y">
      {result.courses.map((course) => (
        <Item
          className="rounded-none px-0"
          key={course.id}
          render={<Link href={`/org/${organizationSlug}/courses/${course.id}` as const} prefetch />}
        >
          <ItemContent>
            <ItemTitle>{course.title}</ItemTitle>
          </ItemContent>
          <ItemActions>
            {!course.isPublished && <Badge variant="outline">{t("Not published")}</Badge>}
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}

export default async function OrganizationCoursesPage({
  params,
}: PageProps<"/[lang]/org/[organizationSlug]/courses">) {
  const t = await getExtracted();

  return (
    <Container>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <ContainerTitle>{t("Courses")}</ContainerTitle>
          <ContainerDescription>
            {t("Correct lessons and approve them before your team sees the change.")}
          </ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <CourseList params={params} />
        </Suspense>
      </ContainerBody>
    </Container>
  );
}
