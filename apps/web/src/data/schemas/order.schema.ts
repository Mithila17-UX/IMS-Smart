import { z } from "zod";

/**
 * Payment method types supported.
 * "tab" represents customer credit account (pay later).
 */
export const PaymentMethodSchema = z.enum(["cash", "card", "tab", "split"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Split payment item detailing how much was paid via each method.
 * All amounts are integer cents (LKR).
 */
export const PaymentSplitItemSchema = z.object({
  method: z.enum(["cash", "card", "tab"]),
  amount: z.number().int().min(0),
});
export type PaymentSplitItem = z.infer<typeof PaymentSplitItemSchema>;

/**
 * Line item within an order.
 * All money values are stored as integer cents (LKR).
 */
export const OrderLineItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  brand: z.string(),
  channel: z.string(), // "inside" | "outside" | custom
  qty: z.number().int().positive(),
  beerPrice: z.number().int().min(0),
  addOn: z.number().int().min(0).default(0),
  depositPortion: z.number().int().min(0).default(0),
  depositWaived: z.boolean().default(false),
  offerId: z.string().optional(),
  offerDiscount: z.number().int().min(0).default(0),
  unitPrice: z.number().int().min(0), // actual charged price per unit
  total: z.number().int().min(0), // unitPrice * qty
});
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

/**
 * Order status.
 * - "open": in progress by cashier (basket)
 * - "closed": payment completed, ledger entries generated
 * - "cancelled": abandoned/voided order
 */
export const OrderStatusSchema = z.enum(["open", "closed", "cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/**
 * Order schema.
 * Represents an internal customer order / tally ticket.
 * Nothing is printed or handed to the customer.
 */
export const OrderSchema = z.object({
  id: z.string(),
  status: OrderStatusSchema.default("closed"),
  lines: z.array(OrderLineItemSchema),
  totalBeerAmount: z.number().int().min(0),
  totalDepositAmount: z.number().int().min(0),
  totalDiscountAmount: z.number().int().min(0).default(0),
  /** Discount applied from a returned bottle discount token. */
  bottleDiscountAmount: z.number().int().min(0).default(0),
  bottleDiscountTokenId: z.string().optional(),
  /** Final total charged = totalBeerAmount + totalDepositAmount - totalDiscountAmount - bottleDiscountAmount. */
  grandTotal: z.number().int().min(0),
  paymentMethod: PaymentMethodSchema,
  splitPayments: z.array(PaymentSplitItemSchema).optional(),
  customerId: z.string().optional(), // required if paymentMethod === "tab" or in split
  cashierId: z.string(),
  createdAt: z.string(),
  closedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type Order = z.infer<typeof OrderSchema>;
