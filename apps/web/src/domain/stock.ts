/**
 * Domain: Stock calculations.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * The stock ledger is an append-only collection of StockMovement documents.
 * Every unit in or out is one movement with a positive (in) or negative (out) qty.
 *
 * Cached counter: products.stockOnHand is a denormalised cache rebuilt by Cloud
 * Functions whenever needed. These pure functions recalculate from the raw ledger
 * when the UI needs an accurate real-time view (e.g. the stock page).
 *
 * WAC (Weighted Average Cost) rule:
 *   On each purchase:
 *     newWAC = (oldStock × oldWAC + qtyIn × purchaseCostPerUnit) / (oldStock + qtyIn)
 *   Integer cents arithmetic; truncate to nearest cent (Math.floor).
 *   If oldStock + qtyIn = 0, WAC stays unchanged (division by zero guard).
 */

import type { StockMovement } from "@/data/schemas/stockMovement.schema";

// ──────────────────────────────────────────────────────────────────────────────
// Stock balance
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calculate current stock on hand for a product from its raw movement ledger.
 *
 * Stock = sum of all qty values (purchases positive, sales/waste/etc. negative).
 */
export function calcStockOnHand(movements: readonly StockMovement[]): number {
  return movements.reduce((sum, m) => sum + m.qty, 0);
}

/**
 * Calculate stock on hand at a specific point in time.
 * Useful for historical reports and reconciliation.
 */
export function calcStockAt(movements: readonly StockMovement[], atTimestamp: string): number {
  const at = new Date(atTimestamp).getTime();
  return movements
    .filter((m) => new Date(m.at).getTime() <= at)
    .reduce((sum, m) => sum + m.qty, 0);
}

/**
 * Per-product stock summary: stock on hand and whether it is below reorder point.
 */
export interface StockSummary {
  productId: string;
  stockOnHand: number;
  reorderPoint: number;
  isLow: boolean;
  /** Days of cover: stockOnHand / avgDailySales. Infinity when avgDailySales = 0. */
  daysOfCover: number;
}

/**
 * Build a stock summary for one product.
 *
 * @param movements All movements for this specific product.
 * @param reorderPoint The product's configured reorder threshold (units).
 * @param avgDailySales 7-day weighted average daily units sold (from domain/reports or caller).
 */
export function calcStockSummary(
  productId: string,
  movements: readonly StockMovement[],
  reorderPoint: number,
  avgDailySales: number,
): StockSummary {
  const stockOnHand = calcStockOnHand(movements);
  const isLow = stockOnHand <= reorderPoint;
  const daysOfCover = avgDailySales > 0 ? stockOnHand / avgDailySales : Infinity;

  return { productId, stockOnHand, reorderPoint, isLow, daysOfCover };
}

// ──────────────────────────────────────────────────────────────────────────────
// WAC (Weighted Average Cost)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate the Weighted Average Cost after receiving new stock.
 *
 *   newWAC = (currentStock × currentWAC + qtyIn × purchaseCost) / (currentStock + qtyIn)
 *
 * Arithmetic is done in integer cents. Result is truncated (Math.floor) to avoid
 * floating-point rounding creeping into stored values.
 *
 * Returns currentWAC unchanged when the sum of stock would be 0 (edge case:
 * receiving zero units is a no-op; negative stock guard).
 *
 * @param currentStock Stock on hand BEFORE the purchase (may be 0 or negative).
 * @param currentWAC   Existing weighted average cost in integer cents.
 * @param qtyIn        Units received in this purchase (must be positive).
 * @param purchaseCost Cost per unit in this purchase in integer cents.
 */
export function calcNewWAC(
  currentStock: number,
  currentWAC: number,
  qtyIn: number,
  purchaseCost: number,
): number {
  if (qtyIn <= 0) return currentWAC; // nothing received

  const totalQty = currentStock + qtyIn;
  if (totalQty <= 0) return currentWAC; // guard: division by zero / fully depleted

  // Integer arithmetic: multiply first to avoid losing cents
  const numerator = currentStock * currentWAC + qtyIn * purchaseCost;
  return Math.floor(numerator / totalQty);
}

/**
 * Replay all purchase movements in chronological order to reconstruct the WAC
 * for a product from scratch. Useful when rebuilding cached data.
 *
 * @param movements All movements for ONE product (any type).
 * @returns The final WAC in integer cents.
 */
export function replayWAC(movements: readonly StockMovement[]): number {
  // Sort chronologically
  const sorted = [...movements].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  let currentStock = 0;
  let wac = 0;

  for (const m of sorted) {
    if (m.type === "purchase" && m.unitPrice !== undefined && m.qty > 0) {
      wac = calcNewWAC(currentStock, wac, m.qty, m.unitPrice);
    }
    currentStock += m.qty;
  }

  return wac;
}

// ──────────────────────────────────────────────────────────────────────────────
// Bottles out (for deposit / return validation)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Count how many outside-channel units the bar has sold WITH a deposit for a product.
 * Used to validate bottle returns: a customer can only return up to this many bottles.
 *
 * "Bottles out" = outside sales with deposit not waived (depositWaived !== true).
 * This does NOT subtract already-returned bottles — see calcBottlesStillOut.
 */
export function calcBottlesOut(movements: readonly StockMovement[]): number {
  return movements
    .filter(
      (m) =>
        m.type === "sale" &&
        m.channel === "outside" &&
        !m.depositWaived &&
        m.qty < 0, // sales are negative qty
    )
    .reduce((sum, m) => sum + Math.abs(m.qty), 0);
}

/**
 * Count bottles still outstanding (not yet returned) for a product.
 *
 * bottlesStillOut = bottlesOut - bottlesAlreadyReturned
 *
 * Returns are NOT stock movements; they are tracked in the bottleReturns
 * collection. Pass the return count in separately.
 *
 * @param movements All movements for this product.
 * @param bottlesReturned Total units returned (from bottleReturns collection sum).
 */
export function calcBottlesStillOut(
  movements: readonly StockMovement[],
  bottlesReturned: number,
): number {
  const out = calcBottlesOut(movements);
  return Math.max(0, out - bottlesReturned);
}

// ──────────────────────────────────────────────────────────────────────────────
// Reorder suggestion
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the reorder point using the safety stock formula:
 *
 *   safetyStock = 1.65 × dailySalesStdDev × √leadDays
 *   reorderPoint = avgDailySales × leadDays + safetyStock
 *
 * Returns Math.ceil of the result (always whole units).
 *
 * @param avgDailySales   7-day weighted average daily sales (units/day).
 * @param dailySalesStdDev Standard deviation of daily sales.
 * @param leadDays        Supplier lead time in calendar days.
 */
export function calcReorderPoint(
  avgDailySales: number,
  dailySalesStdDev: number,
  leadDays: number,
): number {
  if (leadDays <= 0 || avgDailySales <= 0) return 0;
  const safetyStock = 1.65 * dailySalesStdDev * Math.sqrt(leadDays);
  return Math.ceil(avgDailySales * leadDays + safetyStock);
}
