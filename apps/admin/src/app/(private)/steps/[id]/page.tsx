import { AdminEditFormSkeleton, AdminEditFormSkeletonField } from "@/components/admin-edit-form";
import { getStep } from "@/data/steps/get-step";
import { parseStepContent } from "@zoonk/core/steps/contract/content";
import {
  Container,
  ContainerBody,
  ContainerDescription,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import { EmptyView } from "@zoonk/ui/patterns/empty";
import { isUuid } from "@zoonk/utils/uuid";
import { PencilOffIcon } from "lucide-react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MultipleChoiceForm } from "./multiple-choice-form";

export const metadata: Metadata = { title: "Edit Step" };

export default function StepPage({ params }: PageProps<"/steps/[id]">) {
  return (
    <Container>
      <ContainerHeader variant="sidebar">
        <ContainerHeaderGroup>
          <ContainerTitle>Edit step</ContainerTitle>
          <ContainerDescription>
            Change the generated exercise a learner sees. Saved content is validated against the
            same contract the player reads.
          </ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody>
        <Suspense fallback={<StepSkeleton />}>
          <StepContent params={params} />
        </Suspense>
      </ContainerBody>
    </Container>
  );
}

/**
 * Only multiple choice has an editor today, so every other kind explains why
 * its content is read-only instead of rendering a form that cannot save.
 */
async function StepContent({ params }: Pick<PageProps<"/steps/[id]">, "params">) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const step = await getStep(id);

  if (!step) {
    notFound();
  }

  const lesson = step.lesson;

  if (step.kind !== "multipleChoice") {
    return (
      <EmptyView
        description={`Steps of kind "${step.kind}" do not have an editor yet.`}
        icon={PencilOffIcon}
        title="No editor for this step kind"
      />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="border-b pb-5">
        <h2 className="font-medium">{lesson.title ?? "Untitled lesson"}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {lesson.chapter.course.title} · {lesson.chapter.title} · step {step.position}
        </p>
      </div>

      <MultipleChoiceForm
        content={parseStepContent("multipleChoice", step.content)}
        lessonId={lesson.id}
        stepId={step.id}
      />
    </div>
  );
}

/** Mirrors the loaded editor column so streaming the step does not shift it. */
function StepSkeleton() {
  return (
    <AdminEditFormSkeleton>
      <AdminEditFormSkeletonField />
      <AdminEditFormSkeletonField />
      <AdminEditFormSkeletonField />
    </AdminEditFormSkeleton>
  );
}
