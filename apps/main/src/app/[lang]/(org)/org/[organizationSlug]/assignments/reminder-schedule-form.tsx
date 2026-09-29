"use client";

import { Checkbox } from "@zoonk/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldDynamicDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@zoonk/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@zoonk/ui/components/native-select";
import { SubmitButton } from "@zoonk/ui/patterns/buttons/submit";
import { CheckIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { useActionState } from "react";
import {
  type ReminderScheduleState,
  setReminderScheduleAction,
} from "./_actions/set-reminder-schedule";

/** Most field teams this product serves are in Spain. */
const DEFAULT_TIME_ZONE = "Europe/Madrid";

/**
 * Hours and time zones both come from the server: hours so the form can never
 * offer one the core would refuse, and zones because the server's and the
 * browser's lists can differ and would otherwise break hydration.
 */
export function ReminderScheduleForm({
  hours,
  organizationId,
  schedule,
  timeZones,
}: {
  hours: number[];
  organizationId: string;
  schedule: { hour: number; timeZone: string } | null;
  timeZones: string[];
}) {
  const t = useExtracted();

  const [state, formAction] = useActionState(setReminderScheduleAction, {
    status: "idle",
    submissionId: 0,
  } satisfies ReminderScheduleState);

  const error = {
    error: t("Could not save the reminders."),
    idle: null,
    invalidSchedule: t("Choose an hour inside the working day and a valid time zone."),
    saved: null,
  }[state.status];

  return (
    <form
      action={formAction}
      aria-label={t("Reminders")}
      className="flex max-w-2xl flex-col gap-5 rounded-2xl border p-4"
    >
      <input name="organizationId" type="hidden" value={organizationId} />

      <div className="flex flex-col gap-1">
        <h2 className="font-medium">{t("Reminders")}</h2>
        <p className="text-muted-foreground text-sm">
          {t(
            "Learners who turned reminders on get one on weekdays, only if they have not studied yet that day. Never at weekends or outside the hour you choose.",
          )}
        </p>
      </div>

      <FieldLabel className="flex items-center gap-2 font-normal">
        <Checkbox defaultChecked={schedule !== null} name="enabled" />
        {t("Send weekday reminders")}
      </FieldLabel>

      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="reminder-hour">{t("Hour")}</FieldLabel>
            <NativeSelect defaultValue={schedule?.hour ?? 10} id="reminder-hour" name="hour">
              {hours.map((hour) => (
                <NativeSelectOption key={hour} value={hour}>
                  {`${String(hour).padStart(2, "0")}:00`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              {t("Only hours inside the working day are offered.")}
            </FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel htmlFor="reminder-time-zone">{t("Time zone")}</FieldLabel>
            <NativeSelect
              defaultValue={schedule?.timeZone ?? DEFAULT_TIME_ZONE}
              id="reminder-time-zone"
              name="timeZone"
            >
              {timeZones.map((timeZone) => (
                <NativeSelectOption key={timeZone} value={timeZone}>
                  {timeZone}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="min-h-5">
        <FieldDynamicDescription
          key={state.submissionId}
          successMessage={state.status === "saved" ? t("Reminders saved.") : null}
        />
        {error && <FieldError>{error}</FieldError>}
      </div>

      <SubmitButton icon={<CheckIcon />}>{t("Save reminders")}</SubmitButton>
    </form>
  );
}
