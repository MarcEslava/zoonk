"use client";

import { type Course, type MemberTag } from "@zoonk/db";
import { Checkbox } from "@zoonk/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldDynamicDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@zoonk/ui/components/native-select";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { CheckIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { useActionState } from "react";
import { type CreateAssignmentState, createAssignmentAction } from "./_actions/create-assignment";

/** The product's habit is three minutes a day, so that is the starting point. */
const DEFAULT_DAILY_MINUTES = 3;

export function AssignCourseForm({
  courses,
  members,
  organizationId,
  tags,
}: {
  courses: Pick<Course, "id" | "title">[];
  members: { id: string; name: string }[];
  organizationId: string;
  tags: Pick<MemberTag, "id" | "name">[];
}) {
  const t = useExtracted();

  const [state, formAction] = useActionState(createAssignmentAction, {
    status: "idle",
    submissionId: 0,
  } satisfies CreateAssignmentState);

  const error = {
    courseNotAvailable: t("That course can no longer be assigned."),
    created: null,
    error: t("Could not create the assignment."),
    idle: null,
    invalidDetails: t("Check the course, the deadline and the daily minutes."),
    noTargets: t("Choose at least one segment or person."),
  }[state.status];

  return (
    <form
      action={formAction}
      aria-label={t("Assign a course")}
      className="flex max-w-2xl flex-col gap-7"
    >
      <input name="organizationId" type="hidden" value={organizationId} />

      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="courseId">{t("Course")}</FieldLabel>
            <NativeSelect id="courseId" name="courseId" required>
              {courses.map((course) => (
                <NativeSelectOption key={course.id} value={course.id}>
                  {course.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel htmlFor="dailyMinutes">{t("Minutes per day")}</FieldLabel>
            <Input
              defaultValue={DEFAULT_DAILY_MINUTES}
              id="dailyMinutes"
              max={120}
              min={1}
              name="dailyMinutes"
              required
              type="number"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel htmlFor="dueAt">{t("Deadline")}</FieldLabel>
            <Input id="dueAt" name="dueAt" type="date" />
            <FieldDescription>{t("Optional. Leave empty for ongoing training.")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>{t("Segments")}</FieldLegend>
        <FieldDescription>
          {t("Everyone in a segment is included, including people who join it later.")}
        </FieldDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {tags.map((tag) => (
            <FieldLabel className="flex items-center gap-2 font-normal" key={tag.id}>
              <Checkbox name="tagIds" value={tag.id} />
              {tag.name}
            </FieldLabel>
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("People")}</FieldLegend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {members.map((member) => (
            <FieldLabel className="flex items-center gap-2 font-normal" key={member.id}>
              <Checkbox name="memberIds" value={member.id} />
              {member.name}
            </FieldLabel>
          ))}
        </div>
      </FieldSet>

      <div className="min-h-5">
        <FieldDynamicDescription
          key={state.submissionId}
          successMessage={state.status === "created" ? t("Course assigned.") : null}
        />
        {error && <FieldError>{error}</FieldError>}
      </div>

      <SubmitButton icon={<CheckIcon />}>{t("Assign course")}</SubmitButton>
    </form>
  );
}
