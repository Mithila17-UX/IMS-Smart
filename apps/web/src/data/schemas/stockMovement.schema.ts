import { z } from "zod";

/**
 * StockMovement type literals — the full set defined in the blueprint.
 *
 * Append-only ledger: every unit in or out is one document.
 * Current stock = sum(qty) over all movements for a product
 * (purchases add; sales, wastage, staff_drink, complimentary subtract).
 */
export const StockMovementTypeSchema = z.enum([
  "purchase",
  "sale",
  "staff_drink",
  "complimentary",
  "wastage",
  "adjustment",
]);

export type StockMovementType = z.infer<typeof StockMovementTypeSchema>;

/**
 * StockMovement schema.
 *
 * One row in the append-only stock ledger.
 * Positive qty = stock increase (purchase, positive adjustment).
 * Negative qty = stock decrease (sale, wastage, staff_drink, complimentary, negative adjustment).
 *
 * Sales movements also carry pricing data so changing prices later never rewrites history.
 * All money fields are integer cents (LKR).
 */
export const StockMovementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: StockMovementTypeSchema,
  /** Positive = in, negative = out. */
  qty: z.number().int(),
  /** Sales channel if this is a sale: "inside" | "outside" | ... */
  channel: z.string().optional(),
  /** Price the unit was actually sold at in integer cents. */
  unitPrice: z.number().int().min(0).optional(),
  /** Deposit portion of unitPrice in integer cents (0 if waived or not applicable). */
  depositPortion: z.number().int().min(0).optional(),
  /** True when the cashier unticked the deposit at the order pop-up. */
  depositWaived: z.boolean().optional(),
  /** "cash" | "card" | "tab" for sales; undefined for non-sales movements. */
  paymentMethod: z.string().optional(),
  /** Linked order ID if this movement came from a live-tally order. */
  orderId: z.string().optional(),
  /** Linked purchase ID if this is a delivery movement. */
  purchaseId: z.string().optional(),
  /** Offer ID if a happy-hour or special offer applied. */
  offerId: z.string().optional(),
  /** Mandatory for wastage and adjustment types. */
  reason: z.string().optional(),
  /** UID of the admin who approved (for complimentary / staff_drink). */
  approvedBy: z.string().optional(),
  /** UID of the cashier who recorded the movement. */
  cashierId: z.string(),
  /** ISO 8601 timestamp when the movement was recorded. */
  at: z.string(),
});

export type StockMovement = z.infer<typeof StockMovementSchema>;
