import { z } from "zod";

/**
 * Settlement type for returned bottles.
 * - "cash": immediate cash refund paid out from drawer
 * - "discount": single-use discount token to reduce next order total
 */
export const ReturnSettlementSchema = z.enum(["cash", "discount"]);
export type ReturnSettlement = z.infer<typeof ReturnSettlementSchema>;

/**
 * Single-use discount token generated when customer returns bottle for purchase discount.
 */
export const DiscountTokenSchema = z.object({
  tokenId: z.string(),
  amount: z.number().int().positive(), // in integer cents
  businessDate: z.string(), // YYYY-MM-DD
  usedInOrderId: z.string().nullable().default(null),
  usedAt: z.string().optional(),
});
export type DiscountToken = z.infer<typeof DiscountTokenSchema>;

/**
 * BottleReturn schema.
 * Represents customer returning empty bottles for deposit reimbursement.
 * Validated against bottlesStillOut.
 */
export const BottleReturnSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  /** Per-bottle deposit amount at the time of return, in integer cents. */
  depositAmount: z.number().int().min(0),
  /** Total refund amount = depositAmount * qty, in integer cents. */
  totalRefund: z.number().int().min(0),
  settlement: ReturnSettlementSchema,
  discountToken: DiscountTokenSchema.optional(),
  customerId: z.string().optional(),
  cashierId: z.string(),
  at: z.string(),
});
export type BottleReturn = z.infer<typeof BottleReturnSchema>;
