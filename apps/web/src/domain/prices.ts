/**
 * Domain: Price and deposit version resolution.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * WHY this is separate from settings.ts:
 *   Prices and deposit rates are stored in their own append-only collections
 *   (priceVersions, depositVersions) rather than the generic settingVersions.
 *   They are keyed by productId/channel or categoryId rather than a string key,
 *   so the resolution logic differs slightly from getSettingAt().
 *
 * Algorithm (same principle as getSettingAt):
 *   1. Filter versions for the given productId + channel (or categoryId).
 *   2. Keep only those whose effectiveFrom ≤ atTimestamp.
 *   3. Sort descending by effectiveFrom.
 *   4. Take the first entry (most recent effective version).
 *   5. Return null if none found.
 */

import type { PriceVersion, DepositVersion } from "@/data/schemas/product.schema";

// ──────────────────────────────────────────────────────────────────────────────
// Price resolution
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the price version for a product + channel at a given point in time.
 *
 * Returns null when no version exists (product has no price set yet).
 */
export function getPriceAt(
  productId: string,
  channel: string,
  versions: readonly PriceVersion[],
  atTimestamp: string,
): PriceVersion | null {
  const at = new Date(atTimestamp).getTime();

  const applicable = versions
    .filter(
      (v) =>
        v.productId === productId &&
        v.channel === channel &&
        new Date(v.effectiveFrom).getTime() <= at,
    )
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return applicable[0] ?? null;
}

/**
 * Get the current (now) price for a product + channel.
 * Returns null when no version exists.
 */
export function getCurrentPrice(
  productId: string,
  channel: string,
  versions: readonly PriceVersion[],
): PriceVersion | null {
  return getPriceAt(productId, channel, versions, new Date().toISOString());
}

/**
 * Calculate the total selling price for one unit at a point in time.
 * For outside channel: beerPrice + addOn + depositAmount (when deposit applies).
 * For inside channel: beerPrice only (no addOn, no deposit).
 *
 * Returns null when the price version does not exist.
 *
 * @param includeDeposit Whether to add the deposit to the outside price.
 *   Controlled by the depositOnNormalSales / depositOnTabSales setting or
 *   cashier's per-line choice.
 */
export function calcUnitPrice(
  productId: string,
  channel: string,
  priceVersions: readonly PriceVersion[],
  depositAmount: number, // integer cents; 0 for inside channel
  atTimestamp: string,
  includeDeposit: boolean,
): { beerPrice: number; addOn: number; deposit: number; total: number } | null {
  const pv = getPriceAt(productId, channel, priceVersions, atTimestamp);
  if (!pv) return null;

  const deposit = includeDeposit ? depositAmount : 0;
  const total = pv.beerPrice + pv.addOn + deposit;

  return {
    beerPrice: pv.beerPrice,
    addOn: pv.addOn,
    deposit,
    total,
  };
}

/**
 * Get the full price version history for a product + channel, most recent first.
 * Used by the Price History tab in the Products UI.
 */
export function getPriceHistory(
  productId: string,
  channel: string,
  versions: readonly PriceVersion[],
): PriceVersion[] {
  return versions
    .filter((v) => v.productId === productId && v.channel === channel)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
}

// ──────────────────────────────────────────────────────────────────────────────
// Deposit resolution
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the deposit amount for a category at a given point in time.
 *
 * Returns 0 when no version exists (treat as no deposit).
 */
export function getDepositAt(
  categoryId: string,
  versions: readonly DepositVersion[],
  atTimestamp: string,
): number {
  const at = new Date(atTimestamp).getTime();

  const applicable = versions
    .filter(
      (v) => v.categoryId === categoryId && new Date(v.effectiveFrom).getTime() <= at,
    )
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return applicable[0]?.amount ?? 0;
}

/**
 * Get the current (now) deposit amount for a category.
 */
export function getCurrentDeposit(
  categoryId: string,
  versions: readonly DepositVersion[],
): number {
  return getDepositAt(categoryId, versions, new Date().toISOString());
}

/**
 * Get the full deposit version history for a category, most recent first.
 * Used by the Deposit History tab in the Products UI.
 */
export function getDepositHistory(
  categoryId: string,
  versions: readonly DepositVersion[],
): DepositVersion[] {
  return versions
    .filter((v) => v.categoryId === categoryId)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
}
