/**
 * Domain: Bottle Returns & Deposit Reimbursement Logic.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * Blueprint business rules:
 * - Customer returns empty bottles to the bar.
 * - Accept ONLY bottles the bar sold with a deposit:
 *   Quantity returned cannot exceed bottlesStillOut for that product
 *   (outside units sold with deposit minus bottles already returned).
 * - Rate used: Government rate in force at the time of the return.
 * - Settlement options:
 *   1. Cash refund: paid out from cash drawer.
 *   2. Use as discount: generates single-use discount token.
 */

import type { DiscountToken } from "@/data/schemas/bottleReturn.schema";

export interface ReturnValidationResult {
  valid: boolean;
  maxAllowed: number;
  error?: string;
}

/**
 * Validate customer bottle return against outstanding bottles.
 */
export function validateBottleReturn(
  requestedQty: number,
  bottlesStillOut: number,
): ReturnValidationResult {
  if (requestedQty <= 0) {
    return {
      valid: false,
      maxAllowed: Math.max(0, bottlesStillOut),
      error: "Return quantity must be greater than zero.",
    };
  }

  if (bottlesStillOut <= 0) {
    return {
      valid: false,
      maxAllowed: 0,
      error: "No returnable bottles are currently outstanding for this product.",
    };
  }

  if (requestedQty > bottlesStillOut) {
    return {
      valid: false,
      maxAllowed: bottlesStillOut,
      error: `Return quantity (${requestedQty}) exceeds the ${bottlesStillOut} bottles currently outstanding for this product.`,
    };
  }

  return {
    valid: true,
    maxAllowed: bottlesStillOut,
  };
}

/**
 * Calculate total refund amount in integer cents.
 */
export function calcReturnRefund(qty: number, depositRate: number): number {
  if (qty <= 0 || depositRate <= 0) return 0;
  return qty * depositRate;
}

/**
 * Create a new single-use discount token object.
 */
export function buildDiscountToken(
  tokenId: string,
  amount: number,
  businessDate: string,
): DiscountToken {
  return {
    tokenId,
    amount,
    businessDate,
    usedInOrderId: null,
  };
}
