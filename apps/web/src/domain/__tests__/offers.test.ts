import { describe, it, expect } from "vitest";
import { isOfferActive, resolveActiveOffer, calcOfferDiscount } from "../offers";
import type { Offer } from "@/data/schemas/offer.schema";

describe("offers domain logic", () => {
  const sampleOffer: Offer = {
    id: "happy-hour-1",
    name: "Happy Hour 5PM-8PM",
    days: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: "17:00",
    endTime: "20:00",
    productIds: ["lion-lager"],
    categoryIds: [],
    channels: ["inside"],
    ruleType: "amount_off",
    value: 15000, // Rs. 150 off
    priority: 10,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
  };

  const highPriorityOffer: Offer = {
    id: "special-friday",
    name: "Friday Mega Deal",
    days: [5], // Friday
    startTime: "18:00",
    endTime: "21:00",
    productIds: ["lion-lager"],
    categoryIds: [],
    channels: ["inside"],
    ruleType: "fixed_price",
    value: 60000, // Rs. 600 fixed price
    priority: 20, // Higher priority
    active: true,
  };

  it("checks offer active status correctly based on time and days", () => {
    // Construct local date time for testing
    const testDate = new Date(2026, 0, 2, 18, 30); // Friday 18:30 local
    expect(isOfferActive(sampleOffer, testDate.toISOString())).toBe(true);

    // Saturday 18:30 -> day 6, not active
    const saturday = new Date(2026, 0, 3, 18, 30);
    expect(isOfferActive(sampleOffer, saturday.toISOString())).toBe(false);

    // Friday 15:30 -> before start time (17:00)
    const tooEarly = new Date(2026, 0, 2, 15, 30);
    expect(isOfferActive(sampleOffer, tooEarly.toISOString())).toBe(false);

    // Inactive offer flag
    expect(isOfferActive({ ...sampleOffer, active: false }, testDate.toISOString())).toBe(false);
  });

  it("resolves the highest priority offer when multiple match", () => {
    const fridayEvening = new Date(2026, 0, 2, 18, 30).toISOString();
    const winning = resolveActiveOffer(
      [sampleOffer, highPriorityOffer],
      "lion-lager",
      "beer-bottles",
      "inside",
      fridayEvening,
    );

    expect(winning?.id).toBe("special-friday");
  });

  it("respects product, category, and channel filters", () => {
    const testDate = new Date(2026, 0, 2, 18, 30).toISOString();

    // Different product
    expect(
      resolveActiveOffer([sampleOffer], "carlsberg", "beer-bottles", "inside", testDate),
    ).toBeNull();

    // Outside channel (offer is inside only)
    expect(
      resolveActiveOffer([sampleOffer], "lion-lager", "beer-bottles", "outside", testDate),
    ).toBeNull();
  });

  describe("calcOfferDiscount", () => {
    it("calculates amount_off rule", () => {
      const discount = calcOfferDiscount(90000, sampleOffer);
      expect(discount).toBe(15000);
    });

    it("calculates fixed_price rule", () => {
      const discount = calcOfferDiscount(90000, highPriorityOffer);
      expect(discount).toBe(30000); // 900 - 600 = 300 discount
    });

    it("calculates percent_off rule", () => {
      const percentOffer: Offer = {
        ...sampleOffer,
        ruleType: "percent_off",
        value: 20, // 20%
      };
      const discount = calcOfferDiscount(90000, percentOffer);
      expect(discount).toBe(18000); // 20% of 90000 = 18000
    });

    it("clamps discount to basePrice so price cannot become negative", () => {
      const crazyOffer: Offer = {
        ...sampleOffer,
        ruleType: "amount_off",
        value: 150000, // 1500 discount on 900 item
      };
      expect(calcOfferDiscount(90000, crazyOffer)).toBe(90000);
    });
  });
});
