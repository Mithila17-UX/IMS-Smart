import { z } from "zod";

/**
 * Supplier schema.
 *
 * A supplier delivers stock to the bar. Purchase records reference a supplierId.
 */
export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Supplier name is required"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Supplier = z.infer<typeof SupplierSchema>;

/**
 * PurchaseLineItem — one product line within a delivery.
 * All money is integer cents (LKR).
 */
export const PurchaseLineItemSchema = z.object({
  productId: z.string(),
  /** Number of units received. */
  qty: z.number().int().positive(),
  /** Cost per unit in integer cents at time of purchase. Used to update WAC. */
  unitCost: z.number().int().min(0),
});

export type PurchaseLineItem = z.infer<typeof PurchaseLineItemSchema>;

/**
 * Purchase schema.
 *
 * A delivery from a supplier. Creating a purchase also generates a `purchase`
 * StockMovement per line item and triggers WAC recalculation.
 *
 * The purchase record is append-only; corrections are a new purchase with a
 * negative qty adjustment and a reason.
 */
export const PurchaseSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  /** ISO date (YYYY-MM-DD) the delivery was received. */
  deliveredOn: z.string(),
  /** Free text: invoice or delivery number. */
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(PurchaseLineItemSchema).min(1, "At least one item is required"),
  /** UID of the user who recorded the delivery. */
  recordedBy: z.string(),
  createdAt: z.string(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;
