"use client";

import { FieldDynamicDescription, FieldError } from "@zoonk/ui/components/field";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { CheckIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { useActionState } from "react";
import { type ApproveLessonState, approveLessonAction } from "./_actions/review-actions";

export function ApproveLessonForm({ lessonId }: { lessonId: string }) {
  const t = useExtracted();

  const [state, formAction] = useActionState(approveLessonAction, {
    status: "idle",
    submissionId: 0,
  } satisfies ApproveLessonState);

  return (
    <form action={formAction} aria-label={t("Approve lesson")} className="flex flex-col gap-2">
      <input name="lessonId" type="hidden" value={lessonId} />

      <SubmitButton icon={<CheckIcon />}>{t("Approve and publish")}</SubmitButton>

      <div className="min-h-5">
        <FieldDynamicDescription
          key={state.submissionId}
          successMessage={
            state.status === "approved" ? t("Approved. Your team now sees this version.") : null
          }
        />
        {state.status === "ownChanges" && (
          <FieldError>{t("You edited this lesson, so someone else has to approve it.")}</FieldError>
        )}
        {state.status === "error" && <FieldError>{t("Could not approve the lesson.")}</FieldError>}
      </div>
    </form>
  );
}
