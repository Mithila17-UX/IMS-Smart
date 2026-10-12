import { z } from "zod";

/**
 * Customer credit tab account schema.
 * All money amounts in integer cents (LKR).
 */
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  /** Credit limit in integer cents. Default is set by client setting defaultCreditLimit. */
  creditLimit: z.number().int().min(0),
  /** Optional override for due days. If null/undefined, uses defaultDueDays setting. */
  dueDaysOverride: z.number().int().positive().nullable().optional(),
  /** Current outstanding balance in integer cents. */
  balance: z.number().int().default(0),
  /** Timestamp of oldest unpaid tab transaction (used to compute due date). */
  oldestUnpaidDate: z.string().optional(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

/**
 * Due date extension record.
 * Admin can extend a due date for a customer with a mandatory note.
 * Appended to history.
 */
export const DueExtensionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  newDueDate: z.string(), // YYYY-MM-DD
  reason: z.string().min(1, "Reason for extension is required"),
  changedBy: z.string(),
  at: z.string(),
});
export type DueExtension = z.infer<typeof DueExtensionSchema>;
