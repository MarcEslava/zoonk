/**
 * Reminders may only be scheduled inside a working day. The bounds are
 * enforced by core rather than by a form, so no caller can schedule a reminder
 * for the evening, when people are entitled to be offline.
 */
export const REMINDER_EARLIEST_HOUR = 8;
export const REMINDER_LATEST_HOUR = 19;
