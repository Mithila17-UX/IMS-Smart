/**
 * Money utilities.
 *
 * ALL money in the database and domain layer is represented as integer cents
 * (e.g. 10000 cents = Rs. 100.00).
 * Never perform business arithmetic on floating point values.
 */

/**
 * Format integer cents into localized currency display.
 * Default locale is en-LK with currency LKR.
 */
export function formatMoney(
  cents: number,
  currency = "LKR",
  locale = "en-LK",
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a user input string (e.g. "900", "900.50", "Rs. 1,200") to integer cents.
 */
export function parseToCents(input: string): number {
  if (!input) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer cents to a standard decimal string for input fields (e.g. 90000 -> "900.00").
 */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}
