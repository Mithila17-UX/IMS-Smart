/**
 * Domain: Offers and Happy Hour logic.
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * Blueprint rules:
 * - Happy hour and promotional offers have days of week, start/end time, date ranges, product/category filters, channels, and rules.
 * - Rules: fixed_price, amount_off, percent_off.
 * - When offers overlap, the one with the highest priority wins.
 */

import type { Offer } from "@/data/schemas/offer.schema";

/**
 * Check if an offer is active at a specific timestamp.
 */
export function isOfferActive(offer: Offer, atTimestamp: string): boolean {
  if (!offer.active) return false;

  const date = new Date(atTimestamp);
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Day of week check
  if (!offer.days.includes(dayOfWeek)) return false;

  // Calendar date range check (YYYY-MM-DD)
  const isoDate = date.toISOString().slice(0, 10);
  if (offer.startDate && isoDate < offer.startDate) return false;
  if (offer.endDate && isoDate > offer.endDate) return false;

  // Time of day check ("HH:mm")
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;

  if (currentTime < offer.startTime || currentTime > offer.endTime) {
    return false;
  }

  return true;
}

/**
 * Find the winning active offer for a product, category, and sales channel.
 * If multiple offers match, the one with the highest priority wins.
 */
export function resolveActiveOffer(
  offers: readonly Offer[],
  productId: string,
  categoryId: string,
  channel: string,
  atTimestamp: string,
): Offer | null {
  const eligible = offers
    .filter((offer) => {
      if (!isOfferActive(offer, atTimestamp)) return false;

      // Product filter
      if (offer.productIds.length > 0 && !offer.productIds.includes(productId)) {
        return false;
      }

      // Category filter
      if (offer.categoryIds.length > 0 && !offer.categoryIds.includes(categoryId)) {
        return false;
      }

      // Channel filter
      if (offer.channels.length > 0 && !offer.channels.includes(channel)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  return eligible[0] ?? null;
}

/**
 * Calculate the discount amount in integer cents that an offer provides against a base price.
 *
 * @param basePrice Base beer price in integer cents.
 * @param offer The offer to evaluate.
 * @returns Discount amount in integer cents (clamped so price cannot fall below 0).
 */
export function calcOfferDiscount(basePrice: number, offer: Offer): number {
  if (basePrice <= 0) return 0;

  switch (offer.ruleType) {
    case "fixed_price": {
      // If fixed price is 700 and base is 900, discount is 200
      const discount = basePrice - offer.value;
      return Math.max(0, Math.min(basePrice, discount));
    }
    case "amount_off": {
      return Math.min(basePrice, offer.value);
    }
    case "percent_off": {
      // value is percentage 1-100
      const discount = Math.floor((basePrice * offer.value) / 100);
      return Math.min(basePrice, discount);
    }
    default:
      return 0;
  }
}
