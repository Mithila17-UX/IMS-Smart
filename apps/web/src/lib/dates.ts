import { format, parseISO, subDays } from "date-fns";

/**
 * Computes the business date string (YYYY-MM-DD) for a given timestamp,
 * taking into account the client's business day cutoff time (e.g. "04:00").
 *
 * If cutoff is 04:00 and a sale is made at 02:30 AM on 2026-10-12,
 * it belongs to the business date 2026-10-11.
 */
export function getBusinessDate(
  date: Date = new Date(),
  cutoffTime = "04:00",
): string {
  const [cutoffHours, cutoffMinutes] = cutoffTime.split(":").map(Number);
  const hour = date.getHours();
  const minute = date.getMinutes();

  const isBeforeCutoff =
    hour < (cutoffHours ?? 4) ||
    (hour === (cutoffHours ?? 4) && minute < (cutoffMinutes ?? 0));

  const targetDate = isBeforeCutoff ? subDays(date, 1) : date;
  return format(targetDate, "yyyy-MM-dd");
}

/**
 * Format an ISO date/timestamp string into a friendly localized string.
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = parseISO(isoString);
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date or YYYY-MM-DD string into a standard date string.
 */
export function formatDate(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = parseISO(isoString);
    return format(d, "yyyy-MM-dd");
  } catch {
    return isoString;
  }
}
