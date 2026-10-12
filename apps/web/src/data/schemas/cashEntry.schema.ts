import { z } from "zod";

/**
 * Cash entry types.
 * Append-only cash ledger.
 * Positive = cash IN (cash sale, tab payment received, opening float).
 * Negative = cash OUT (deposit cash refund, bar expense, cash drop).
 */
export const CashEntryTypeSchema = z.enum([
  "sale",
  "tab_payment",
  "deposit_refund",
  "expense",
  "float_in",
  "float_out",
]);
export type CashEntryType = z.infer<typeof CashEntryTypeSchema>;

/**
 * CashEntry schema.
 * One row in the append-only cash drawer ledger.
 * All amounts are integer cents (LKR).
 */
export const CashEntrySchema = z.object({
  id: z.string(),
  type: CashEntryTypeSchema,
  /** Positive = cash into drawer, negative = cash out of drawer. In integer cents. */
  amount: z.number().int(),
  paymentMethod: z.enum(["cash", "card"]).default("cash"),
  categoryId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  returnId: z.string().optional(),
  reason: z.string().optional(),
  recordedBy: z.string(),
  at: z.string(),
});
export type CashEntry = z.infer<typeof CashEntrySchema>;

/**
 * ExpenseCategory schema.
 * Represents custom categories for bar-related operational expenses (gas, ice, lemon, etc.).
 */
export const ExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required"),
  /** Whether expenses logged in this category reduce the daily net profit calculation. */
  affectsProfit: z.boolean().default(true),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
