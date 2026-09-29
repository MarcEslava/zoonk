import { Link } from "@/i18n/navigation";
import { getLessonReview } from "@zoonk/core/lesson-reviews/get-lesson-review";
import { Badge } from "@zoonk/ui/components/badge";
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
import { isUuid } from "@zoonk/utils/uuid";
import { type Metadata } from "next";
import { getExtracted, getFormatter } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findOrganization } from "../../_utils/find-organization";
import { ApproveLessonForm } from "./approve-lesson-form";
import { StepEditor } from "./step-editors/step-editor";

type LessonReviewPageProps = PageProps<"/[lang]/org/[organizationSlug]/lessons/[lessonId]">;
type LessonReview = Extract<Awaited<ReturnType<typeof getLessonReview>>, { status: "ready" }>;

/**
 * Resolves the lesson only inside the organization named in the URL, so a
 * person who belongs to two organizations cannot review one's lesson under the
 * other's address.
 */
async function findLessonReview({
  lessonId,
  organizationSlug,
}: {
  lessonId: string;
  organizationSlug: string;
}) {
  const membership = await findOrganization(organizationSlug);

  if (!membership || !isUuid(lessonId)) {
    return null;
  }

  const review = await getLessonReview({ lessonId });

  if (review.status !== "ready" || review.lesson.organizationId !== membership.organization.id) {
    return null;
  }

  return review;
}

export async function generateMetadata({ params }: LessonReviewPageProps): Promise<Metadata> {
  const review = await findLessonReview(await params);
  const t = await getExtracted();

  return { title: review?.lesson.title ?? t("Review lesson") };
}

async function ApprovalPanel({ review }: { review: LessonReview }) {
  const t = await getExtracted();

  if (!review.hasPendingChanges) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("Approved. Your team sees exactly what is below.")}
      </p>
    );
  }

  if (review.isOwnChange) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("You edited this lesson, so someone else has to approve it.")}
      </p>
    );
  }

  return <ApproveLessonForm lessonId={review.lesson.id} />;
}

async function StepKindLabel({ kind }: { kind: string }) {
  const t = await getExtracted();

  const labels: Record<string, string> = {
    fillBlank: t("Fill in the blank"),
    matchColumns: t("Match columns"),
    multipleChoice: t("Multiple choice"),
    sortOrder: t("Sort order"),
    static: t("Explanation"),
  };

  return <span className="text-muted-foreground text-sm">{labels[kind] ?? kind}</span>;
}

async function ReviewHistory({ history }: { history: LessonReview["history"] }) {
  const t = await getExtracted();
  const format = await getFormatter();

  if (history.length === 0) {
    return null;
  }

  return (
    <section aria-label={t("History")} className="flex flex-col gap-2">
      <h2 className="font-medium">{t("History")}</h2>

      <ItemGroup className="divide-y">
        {history.map((event) => (
          <Item className="rounded-none px-0" key={event.id} size="sm">
            <ItemContent>
              <ItemTitle>
                {t(
                  "{action, select, approved {Approved} draftDiscarded {Draft discarded} other {Step edited}}",
                  { action: event.action },
                )}
              </ItemTitle>
              <ItemDescription>
                {[
                  event.actorName ?? t("Former member"),
                  format.dateTime(event.createdAt, { dateStyle: "medium", timeStyle: "short" }),
                ].join(" · ")}
              </ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}

async function LessonReviewContent({ params }: Pick<LessonReviewPageProps, "params">) {
  const { lessonId, organizationSlug } = await params;
  const review = await findLessonReview({ lessonId, organizationSlug });

  if (!review) {
    notFound();
  }

  const t = await getExtracted();

  return (
    <>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <Link
            className="text-muted-foreground text-sm hover:underline"
            href={`/org/${organizationSlug}/courses/${review.lesson.courseId}` as const}
            prefetch
          >
            {[review.lesson.courseTitle, review.lesson.chapterTitle].join(" · ")}
          </Link>
          <ContainerTitle>{review.lesson.title}</ContainerTitle>
          <ContainerDescription>
            {t("Changes stay as drafts until someone who did not make them approves the lesson.")}
          </ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody className="gap-10">
        <ApprovalPanel review={review} />

        {review.steps.map((step, index) => (
          <section
            aria-label={t("Step {number, number}", { number: index + 1 })}
            className="flex flex-col gap-3 border-t pt-6"
            key={step.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{t("Step {number, number}", { number: index + 1 })}</h2>
              <StepKindLabel kind={step.kind} />
              {step.draft && (
                <Badge variant="secondary">
                  {t("Draft by {name}", { name: step.draft.editedByName })}
                </Badge>
              )}
            </div>

            <StepEditor
              content={step.draft?.content ?? step.content}
              hasDraft={step.draft !== null}
              kind={step.kind}
              label={t("Edit step {number, number}", { number: index + 1 })}
              stepId={step.id}
            />
          </section>
        ))}

        <ReviewHistory history={review.history} />
      </ContainerBody>
    </>
  );
}

export default function LessonReviewPage({ params }: LessonReviewPageProps) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LessonReviewContent params={params} />
      </Suspense>
    </Container>
  );
}
