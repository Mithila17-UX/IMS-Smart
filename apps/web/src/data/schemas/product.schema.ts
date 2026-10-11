import { z } from "zod";

/**
 * Category schema.
 *
 * A category groups products by their type (e.g. "Bottled Beer").
 * It defines the unit used to measure each item, whether the container
 * is returnable (triggers the bottle-deposit flow), and which sales channels
 * the category supports.
 */
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required"),
  /** The unit of measure, e.g. "bottle", "can", "keg". */
  unit: z.string().min(1, "Unit is required"),
  /** True = customers can return the container for a deposit refund. */
  returnableContainer: z.boolean().default(false),
  /** Sales channels available for this category, e.g. ["inside", "outside"]. */
  channels: z.array(z.string()).min(1, "At least one channel is required"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

/**
 * Product schema.
 *
 * A product is one SKU within a category (e.g. "Lion Lager 625ml").
 * stockOnHand is a cached counter rebuilt by Cloud Functions.
 * avgCost (WAC) is updated on every purchase.
 * All money fields are integer cents (LKR).
 */
export const ProductSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  brand: z.string().min(1, "Brand is required"),
  name: z.string().min(1, "Product name is required"),
  /** Minimum stock level that triggers a reorder suggestion. */
  reorderPoint: z.number().int().min(0).default(0),
  /** Cached current stock on hand. Rebuilt by Cloud Functions from stockMovements. */
  stockOnHand: z.number().int().default(0),
  /** Weighted average cost per unit in integer cents. Updated on each purchase. */
  avgCost: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * PriceVersion schema.
 *
 * Stores one version of a product's price for one sales channel.
 * The effective price at any moment is the most recent version
 * where effectiveFrom ≤ the moment's timestamp.
 *
 * Outside price = beerPrice + addOn + depositAmount (from category's DepositVersion).
 * Inside price  = beerPrice (addOn = 0, no deposit).
 *
 * All money values are integer cents (LKR).
 */
export const PriceVersionSchema = z.object({
  id: z.string().optional(), // Firestore doc ID, set by repository
  productId: z.string(),
  channel: z.string(), // "inside" | "outside" | any custom channel
  /** Base beer price in integer cents. */
  beerPrice: z.number().int().min(0),
  /** Bar's markup above beerPrice for outside/takeaway sales, in integer cents. */
  addOn: z.number().int().min(0).default(0),
  /** ISO 8601 timestamp when this version became effective. */
  effectiveFrom: z.string(),
  /** UID of the admin who set this price. */
  changedBy: z.string(),
  changeReason: z.string().optional(),
});

export type PriceVersion = z.infer<typeof PriceVersionSchema>;

/**
 * DepositVersion schema.
 *
 * Stores one version of the government-mandated deposit rate for a category.
 * All returns use the rate in force at the time of the return.
 *
 * Amount is in integer cents (LKR).
 */
export const DepositVersionSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string(),
  /** Deposit amount per unit in integer cents. */
  amount: z.number().int().min(0),
  /** ISO 8601 timestamp when this rate became effective. */
  effectiveFrom: z.string(),
  changedBy: z.string(),
  changeReason: z.string().optional(),
});

export type DepositVersion = z.infer<typeof DepositVersionSchema>;
