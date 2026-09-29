import { errors } from "@/lib/api-errors";
import { withApiErrorBoundary } from "@/lib/api-handler";
import { parseBody } from "@/lib/body-parser";
import { reminderScheduleSchema } from "@/lib/openapi/schemas/organizations";
import { organizationPathParamsSchema } from "@/lib/openapi/schemas/paths";
import { organizationAccessError, toReminderSchedule } from "@/lib/organization-responses";
import { parsePathParams } from "@/lib/path-params";
import {
  getOrganizationReminderSchedule,
  setOrganizationReminderSchedule,
} from "@zoonk/core/organizations/reminder-schedule";
import { type NextRequest, NextResponse } from "next/server";

type ReminderScheduleRouteContext =
  RouteContext<"/v1/organizations/[organizationId]/reminder-schedule">;

async function parseOrganizationPath(context: ReminderScheduleRouteContext) {
  return parsePathParams({ params: await context.params, schema: organizationPathParamsSchema });
}

function getRefusedScheduleResponse(
  status: "forbidden" | "invalidSchedule" | "notFound" | "unauthorized",
) {
  if (status === "invalidSchedule") {
    return errors.badRequest("Unknown time zone or hour outside the working day");
  }

  return organizationAccessError(status);
}

/** Reads when an organization reminds its team, or null when reminders are off. */
async function getReminderSchedule(_request: Request, context: ReminderScheduleRouteContext) {
  const path = await parseOrganizationPath(context);

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await getOrganizationReminderSchedule(path.data);

  if (result.status !== "ready") {
    return organizationAccessError(result.status);
  }

  return NextResponse.json(toReminderSchedule(result.schedule));
}

/** Turns weekday reminders on at one local hour of the working day. */
async function putReminderSchedule(request: NextRequest, context: ReminderScheduleRouteContext) {
  const [body, path] = await Promise.all([
    parseBody(request, reminderScheduleSchema),
    parseOrganizationPath(context),
  ]);

  if (!path.success) {
    return errors.validation(path.error);
  }

  if (!body.success) {
    return errors.validation(body.error);
  }

  const result = await setOrganizationReminderSchedule({ ...path.data, schedule: body.data });

  if (result.status !== "saved") {
    return getRefusedScheduleResponse(result.status);
  }

  return NextResponse.json(toReminderSchedule(body.data));
}

/** Turns an organization's reminders off. */
async function deleteReminderSchedule(_request: Request, context: ReminderScheduleRouteContext) {
  const path = await parseOrganizationPath(context);

  if (!path.success) {
    return errors.validation(path.error);
  }

  const result = await setOrganizationReminderSchedule({ ...path.data, schedule: null });

  if (result.status !== "saved") {
    return getRefusedScheduleResponse(result.status);
  }

  return new NextResponse(null, { status: 204 });
}

export const GET = withApiErrorBoundary(getReminderSchedule);
export const PUT = withApiErrorBoundary(putReminderSchedule);
export const DELETE = withApiErrorBoundary(deleteReminderSchedule);
