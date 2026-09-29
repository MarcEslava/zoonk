/** `Date#getUTCDay` numbering, where Sunday is 0. */
const MONDAY = 1;
const FRIDAY = 5;

/**
 * Whether a learner-local calendar day is a working day. Progress dates are
 * stored at UTC midnight of the local day, so the UTC weekday is the local one.
 *
 * The weekly habit and weekday reminders share this one definition: if they
 * ever disagreed, someone could be reminded on a day their habit never counts.
 */
export function isWorkday(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday >= MONDAY && weekday <= FRIDAY;
}
