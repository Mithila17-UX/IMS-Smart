/**
 * Domain: Tab Customers & Credit Accounts Logic.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * Blueprint business rules:
 * - Each customer has a credit limit and due period.
 * - Default credit limit and default due days come from settings.
 * - Changing default due days in settings applies to all customers using the default.
 * - Per-customer override: dueDaysOverride.
 * - Admin can extend a due date with a reason note.
 * - Overdue tabs are flagged on dashboard and credit report.
 * - Sales that exceed the credit limit require admin approval.
 */

import { addDays, format, parseISO } from "date-fns";

/**
 * Calculate available credit before reaching limit.
 */
export function calcCreditAvailable(creditLimit: number, currentBalance: number): number {
  return creditLimit - currentBalance;
}

/**
 * Check if a tab sale would breach the customer's credit limit.
 */
export function isOverCreditLimit(
  creditLimit: number,
  currentBalance: number,
  additionalAmount: number,
): boolean {
  return currentBalance + additionalAmount > creditLimit;
}

/**
 * Calculate the effective due date for a customer's unpaid tab.
 *
 * Priority:
 * 1. If an admin extension exists, the extension date is the due date.
 * 2. If the customer has unpaid tab items, oldestUnpaidDate + (dueDaysOverride ?? defaultDueDays).
 * 3. If no unpaid balance, returns null.
 *
 * @param oldestUnpaidDate ISO date or timestamp of oldest unpaid transaction.
 * @param defaultDueDays Default due period from client settings (e.g. 30).
 * @param customerDueDaysOverride Per-customer override if configured.
 * @param latestExtensionDate Latest admin-approved extension date (YYYY-MM-DD).
 * @returns Due date string "YYYY-MM-DD" or null.
 */
export function calcCustomerDueDate(
  oldestUnpaidDate: string | undefined | null,
  defaultDueDays: number,
  customerDueDaysOverride?: number | null,
  latestExtensionDate?: string | null,
): string | null {
  if (latestExtensionDate) {
    return latestExtensionDate;
  }

  if (!oldestUnpaidDate) {
    return null;
  }

  try {
    const daysToAdd = customerDueDaysOverride ?? defaultDueDays;
    const baseDate = parseISO(oldestUnpaidDate);
    const dueDate = addDays(baseDate, daysToAdd);
    return format(dueDate, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

/**
 * Determine if a customer's tab is currently overdue.
 *
 * @param dueDate Due date string (YYYY-MM-DD).
 * @param currentBusinessDate Today's business date (YYYY-MM-DD).
 */
export function isTabOverdue(
  dueDate: string | null | undefined,
  currentBusinessDate: string,
): boolean {
  if (!dueDate) return false;
  return dueDate < currentBusinessDate;
}
