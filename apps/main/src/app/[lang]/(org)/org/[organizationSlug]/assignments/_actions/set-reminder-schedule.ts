"use server";

import { setOrganizationReminderSchedule } from "@zoonk/core/organizations/reminder-schedule";
import { parseFormField } from "@zoonk/utils/form";
import { isUuid } from "@zoonk/utils/uuid";
import { revalidatePath } from "next/cache";

export type ReminderScheduleState = {
  status: "idle" | "saved" | "invalidSchedule" | "error";
  submissionId: number;
};

/**
 * Reports an outcome for the form to translate: the locale of the submitting
 * page cannot be resolved inside a Server Action.
 */
export async function setReminderScheduleAction(
  previousState: ReminderScheduleState,
  formData: FormData,
): Promise<ReminderScheduleState> {
  const submissionId = previousState.submissionId + 1;
  const organizationId = parseFormField(formData, "organizationId");

  if (!isUuid(organizationId)) {
    return { status: "error", submissionId };
  }

  const result = await setOrganizationReminderSchedule({
    organizationId,
    schedule:
      formData.get("enabled") === null
        ? null
        : {
            hour: Number(parseFormField(formData, "hour")),
            timeZone: parseFormField(formData, "timeZone") ?? "",
          },
  });

  if (result.status === "invalidSchedule") {
    return { status: "invalidSchedule", submissionId };
  }

  if (result.status !== "saved") {
    return { status: "error", submissionId };
  }

  revalidatePath("/[lang]/org/[organizationSlug]/assignments", "page");

  return { status: "saved", submissionId };
}
