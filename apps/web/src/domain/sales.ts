/**
 * Domain: Sales, Live Tally & Order Pricing Logic.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * Blueprint business rules:
 * - Inside price: beerPrice (addOn = 0, no deposit).
 * - Outside price: beerPrice + addOn + bottle deposit (if applicable).
 * - Deposit switches: depositOnNormalSales and depositOnTabSales (both default on).
 * - In allow_change mode, cashier can tick or untick deposit per line.
 *   If unticked, depositWaived = true, depositPortion = 0, and item does NOT count as a bottle out.
 * - Active offers apply automatically to the base beer price.
 * - Returned bottle discount tokens can be deducted from the grand total.
 */

import type { PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import type { Offer } from "@/data/schemas/offer.schema";
import type { OrderLineItem, PaymentSplitItem } from "@/data/schemas/order.schema";
import { getPriceAt, getDepositAt } from "./prices";
import { resolveActiveOffer, calcOfferDiscount } from "./offers";

export interface ResolvedPriceBreakdown {
  beerPrice: number;
  addOn: number;
  depositPortion: number;
  depositWaived: boolean;
  offerId?: string;
  offerDiscount: number;
  unitPrice: number; // Final charged amount per unit
}

/**
 * Resolve price parts for a single item being added to an order.
 */
export function resolveSalePrice(params: {
  productId: string;
  categoryId: string;
  channel: string;
  isTabSale: boolean;
  isReturnable: boolean;
  priceVersions: readonly PriceVersion[];
  depositVersions: readonly DepositVersion[];
  depositOnNormalSales: boolean;
  depositOnTabSales: boolean;
  cashierDepositWaived: boolean;
  offers: readonly Offer[];
  atTimestamp: string;
}): ResolvedPriceBreakdown | null {
  const pv = getPriceAt(params.productId, params.channel, params.priceVersions, params.atTimestamp);
  if (!pv) return null;

  const isOutside = params.channel === "outside";
  const depositRate = params.isReturnable && isOutside
    ? getDepositAt(params.categoryId, params.depositVersions, params.atTimestamp)
    : 0;

  // Global setting determines default deposit behavior for normal vs tab
  const globalDepositSwitch = params.isTabSale
    ? params.depositOnTabSales
    : params.depositOnNormalSales;

  // Deposit portion is added only if category is returnable, channel is outside,
  // global switch is on, and cashier has not waived it.
  const shouldChargeDeposit =
    params.isReturnable && isOutside && globalDepositSwitch && !params.cashierDepositWaived;

  const depositPortion = shouldChargeDeposit ? depositRate : 0;
  const depositWaived = params.isReturnable && isOutside && params.cashierDepositWaived;

  // Check for active offer discount on base beer price
  const activeOffer = resolveActiveOffer(
    params.offers,
    params.productId,
    params.categoryId,
    params.channel,
    params.atTimestamp,
  );

  const offerDiscount = activeOffer ? calcOfferDiscount(pv.beerPrice, activeOffer) : 0;
  const discountedBeerPrice = Math.max(0, pv.beerPrice - offerDiscount);

  // Total unit price charged to customer
  const unitPrice = discountedBeerPrice + pv.addOn + depositPortion;

  return {
    beerPrice: pv.beerPrice,
    addOn: pv.addOn,
    depositPortion,
    depositWaived,
    offerId: activeOffer ? activeOffer.id : undefined,
    offerDiscount,
    unitPrice,
  };
}

/**
 * Re-evaluate line items when an order's payment method is changed to Tab (or back to Normal).
 * Applies the tab deposit switch vs normal deposit switch.
 */
export function adjustLinesForPaymentMethod(
  lines: readonly OrderLineItem[],
  isTabSale: boolean,
  depositOnNormalSales: boolean,
  depositOnTabSales: boolean,
  depositRate: number,
): OrderLineItem[] {
  const depositSwitch = isTabSale ? depositOnTabSales : depositOnNormalSales;

  return lines.map((line) => {
    // Only outside items with returnable containers have deposit logic
    if (line.channel !== "outside" || line.depositWaived) {
      return line;
    }

    const newDeposit = depositSwitch ? depositRate : 0;
    const discountedBeer = Math.max(0, line.beerPrice - line.offerDiscount);
    const newUnitPrice = discountedBeer + line.addOn + newDeposit;

    return {
      ...line,
      depositPortion: newDeposit,
      unitPrice: newUnitPrice,
      total: newUnitPrice * line.qty,
    };
  });
}

export interface OrderTotals {
  totalBeerAmount: number;
  totalDepositAmount: number;
  totalDiscountAmount: number;
  bottleDiscountAmount: number;
  grandTotal: number;
}

/**
 * Calculate grand totals for an order.
 *
 * @param lines Array of line items in order.
 * @param bottleDiscount Discount amount from a returned-bottle discount token.
 */
export function calcOrderTotals(
  lines: readonly OrderLineItem[],
  bottleDiscount = 0,
): OrderTotals {
  let totalBeerAmount = 0;
  let totalDepositAmount = 0;
  let totalDiscountAmount = 0;

  for (const line of lines) {
    const discountedBeer = Math.max(0, line.beerPrice - line.offerDiscount);
    totalBeerAmount += (discountedBeer + line.addOn) * line.qty;
    totalDepositAmount += line.depositPortion * line.qty;
    totalDiscountAmount += line.offerDiscount * line.qty;
  }

  const subtotal = totalBeerAmount + totalDepositAmount;
  const grandTotal = Math.max(0, subtotal - bottleDiscount);

  return {
    totalBeerAmount,
    totalDepositAmount,
    totalDiscountAmount,
    bottleDiscountAmount: Math.min(subtotal, bottleDiscount),
    grandTotal,
  };
}

/**
 * Validate that split payment allocations equal the order grand total.
 */
export function validateSplitPayment(
  grandTotal: number,
  splits: readonly PaymentSplitItem[],
): { valid: boolean; difference: number } {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  const difference = grandTotal - sum;
  return {
    valid: difference === 0,
    difference,
  };
}
