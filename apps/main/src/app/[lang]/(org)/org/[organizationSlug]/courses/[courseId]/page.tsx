import { Link } from "@/i18n/navigation";
import { getCourseReview } from "@zoonk/core/lesson-reviews/get-course-review";
import { Badge } from "@zoonk/ui/components/badge";
import {
  Container,
  ContainerBody,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@zoonk/ui/components/item";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { isUuid } from "@zoonk/utils/uuid";
import { type Metadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findOrganization } from "../../_utils/find-organization";

type CourseReviewPageProps = PageProps<"/[lang]/org/[organizationSlug]/courses/[courseId]">;

/**
 * Resolves the course only inside the organization named in the URL, so a
 * person who belongs to two organizations cannot read one's course under the
 * other's address.
 */
async function findCourseReview({
  courseId,
  organizationSlug,
}: {
  courseId: string;
  organizationSlug: string;
}) {
  const membership = await findOrganization(organizationSlug);

  if (!membership || !isUuid(courseId)) {
    return null;
  }

  const review = await getCourseReview({ courseId });

  if (review.status !== "ready" || review.course.organizationId !== membership.organization.id) {
    return null;
  }

  return review;
}

export async function generateMetadata({ params }: CourseReviewPageProps): Promise<Metadata> {
  const review = await findCourseReview(await params);
  const t = await getExtracted();

  return { title: review?.course.title ?? t("Courses") };
}

async function LessonStatus({
  draftCount,
  isPublished,
}: {
  draftCount: number;
  isPublished: boolean;
}) {
  const t = await getExtracted();

  if (draftCount > 0) {
    return (
      <Badge variant="secondary">
        {t("{count, plural, one {# change to approve} other {# changes to approve}}", {
          count: draftCount,
        })}
      </Badge>
    );
  }

  if (!isPublished) {
    return <Badge variant="outline">{t("Waiting for approval")}</Badge>;
  }

  return <Badge variant="success">{t("Approved")}</Badge>;
}

type ChapterReview = Extract<
  Awaited<ReturnType<typeof getCourseReview>>,
  { status: "ready" }
>["chapters"][number];

function ChapterLessons({
  chapter,
  organizationSlug,
}: {
  chapter: ChapterReview;
  organizationSlug: string;
}) {
  return (
    <section aria-label={chapter.title} className="flex flex-col gap-2">
      <h2 className="font-medium">{chapter.title}</h2>

      <ItemGroup className="divide-y">
        {chapter.lessons.map((lesson) => (
          <Item
            className="rounded-none px-0"
            key={lesson.id}
            render={
              <Link href={`/org/${organizationSlug}/lessons/${lesson.id}` as const} prefetch />
            }
          >
            <ItemContent>
              <ItemTitle>{lesson.title}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <LessonStatus draftCount={lesson.draftCount} isPublished={lesson.isPublished} />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}

async function CourseOutline({ params }: Pick<CourseReviewPageProps, "params">) {
  const { courseId, organizationSlug } = await params;
  const review = await findCourseReview({ courseId, organizationSlug });

  if (!review) {
    notFound();
  }

  return (
    <>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <ContainerTitle>{review.course.title}</ContainerTitle>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody className="gap-8">
        {review.chapters.map((chapter) => (
          <ChapterLessons chapter={chapter} key={chapter.id} organizationSlug={organizationSlug} />
        ))}
      </ContainerBody>
    </>
  );
}

export default function CourseReviewPage({ params }: CourseReviewPageProps) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CourseOutline params={params} />
      </Suspense>
    </Container>
  );
}
