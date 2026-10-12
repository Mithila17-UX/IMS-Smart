import { z } from "zod";

/**
 * Offer rule types.
 * - fixed_price: unit price becomes fixed value in integer cents
 * - amount_off: discount off unit price in integer cents
 * - percent_off: discount percentage (1-100)
 */
export const OfferRuleTypeSchema = z.enum(["fixed_price", "amount_off", "percent_off"]);
export type OfferRuleType = z.infer<typeof OfferRuleTypeSchema>;

/**
 * Offer schema (Happy Hour and promotions).
 */
export const OfferSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Offer name is required"),
  /** Days of the week when offer is active: 0 = Sun, 1 = Mon, ..., 6 = Sat. */
  days: z.array(z.number().int().min(0).max(6)).min(1, "At least one day is required"),
  /** Start time in 24h format "HH:mm", e.g. "17:00". */
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:mm"),
  /** End time in 24h format "HH:mm", e.g. "20:00". */
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:mm"),
  /** Product IDs this offer applies to (empty means all products in category or catalogue). */
  productIds: z.array(z.string()).default([]),
  /** Category IDs this offer applies to (empty means all categories). */
  categoryIds: z.array(z.string()).default([]),
  /** Channels where this offer applies, e.g. ["inside"]. Empty means all channels. */
  channels: z.array(z.string()).default([]),
  ruleType: OfferRuleTypeSchema,
  /** Value: integer cents for fixed_price / amount_off; percent integer (1-100) for percent_off. */
  value: z.number().int().positive(),
  /** Priority when offers overlap (higher number wins). */
  priority: z.number().int().default(1),
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(), // YYYY-MM-DD
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;
