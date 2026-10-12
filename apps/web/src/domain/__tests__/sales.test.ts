import { describe, it, expect } from "vitest";
import {
  resolveSalePrice,
  adjustLinesForPaymentMethod,
  calcOrderTotals,
  validateSplitPayment,
} from "../sales";
import type { PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import type { Offer } from "@/data/schemas/offer.schema";
import type { OrderLineItem } from "@/data/schemas/order.schema";

describe("sales domain logic", () => {
  const priceVersions: PriceVersion[] = [
    {
      productId: "lion-lager",
      channel: "inside",
      beerPrice: 90000, // Rs 900
      addOn: 0,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin",
    },
    {
      productId: "lion-lager",
      channel: "outside",
      beerPrice: 90000,
      addOn: 10000, // Rs 100
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin",
    },
  ];

  const depositVersions: DepositVersion[] = [
    {
      categoryId: "beer-bottles",
      amount: 20000, // Rs 200
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin",
    },
  ];

  const now = "2026-01-15T12:00:00.000Z";

  describe("resolveSalePrice", () => {
    it("resolves inside sale price without deposit or addon", () => {
      const res = resolveSalePrice({
        productId: "lion-lager",
        categoryId: "beer-bottles",
        channel: "inside",
        isTabSale: false,
        isReturnable: true,
        priceVersions,
        depositVersions,
        depositOnNormalSales: true,
        depositOnTabSales: true,
        cashierDepositWaived: false,
        offers: [],
        atTimestamp: now,
      });

      expect(res).toEqual({
        beerPrice: 90000,
        addOn: 0,
        depositPortion: 0,
        depositWaived: false,
        offerId: undefined,
        offerDiscount: 0,
        unitPrice: 90000,
      });
    });

    it("resolves outside sale price with addon and deposit", () => {
      const res = resolveSalePrice({
        productId: "lion-lager",
        categoryId: "beer-bottles",
        channel: "outside",
        isTabSale: false,
        isReturnable: true,
        priceVersions,
        depositVersions,
        depositOnNormalSales: true,
        depositOnTabSales: true,
        cashierDepositWaived: false,
        offers: [],
        atTimestamp: now,
      });

      expect(res).toEqual({
        beerPrice: 90000,
        addOn: 10000,
        depositPortion: 20000,
        depositWaived: false,
        offerId: undefined,
        offerDiscount: 0,
        unitPrice: 120000, // 900 + 100 + 200 = 1200
      });
    });

    it("handles cashier deposit waiver in pop-up", () => {
      const res = resolveSalePrice({
        productId: "lion-lager",
        categoryId: "beer-bottles",
        channel: "outside",
        isTabSale: false,
        isReturnable: true,
        priceVersions,
        depositVersions,
        depositOnNormalSales: true,
        depositOnTabSales: true,
        cashierDepositWaived: true, // Cashier unticked deposit in popup
        offers: [],
        atTimestamp: now,
      });

      expect(res?.depositPortion).toBe(0);
      expect(res?.depositWaived).toBe(true);
      expect(res?.unitPrice).toBe(100000); // 900 + 100 = 1000
    });

    it("applies active offer discount to base price", () => {
      const offer: Offer = {
        id: "offer-1",
        name: "Test discount",
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: "00:00",
        endTime: "23:59",
        productIds: ["lion-lager"],
        categoryIds: [],
        channels: ["inside"],
        ruleType: "amount_off",
        value: 10000, // 100 off
        priority: 1,
        active: true,
      };

      const res = resolveSalePrice({
        productId: "lion-lager",
        categoryId: "beer-bottles",
        channel: "inside",
        isTabSale: false,
        isReturnable: true,
        priceVersions,
        depositVersions,
        depositOnNormalSales: true,
        depositOnTabSales: true,
        cashierDepositWaived: false,
        offers: [offer],
        atTimestamp: now,
      });

      expect(res?.offerId).toBe("offer-1");
      expect(res?.offerDiscount).toBe(10000);
      expect(res?.unitPrice).toBe(80000); // 900 - 100 = 800
    });
  });

  describe("adjustLinesForPaymentMethod", () => {
    it("adjusts deposit when switched from normal to tab sale where tab deposit switch is off", () => {
      const sampleLines: OrderLineItem[] = [
        {
          id: "line-1",
          productId: "lion-lager",
          productName: "Lion Lager",
          brand: "Lion",
          channel: "outside",
          qty: 2,
          beerPrice: 90000,
          addOn: 10000,
          depositPortion: 20000,
          depositWaived: false,
          offerDiscount: 0,
          unitPrice: 120000,
          total: 240000,
        },
      ];

      // Tab sales deposit switch is false
      const adjusted = adjustLinesForPaymentMethod(
        sampleLines,
        true, // isTabSale
        true, // depositOnNormalSales
        false, // depositOnTabSales
        20000,
      );

      expect(adjusted[0]?.depositPortion).toBe(0);
      expect(adjusted[0]?.unitPrice).toBe(100000);
      expect(adjusted[0]?.total).toBe(200000);
    });
  });

  describe("calcOrderTotals and validateSplitPayment", () => {
    const lines: OrderLineItem[] = [
      {
        id: "l1",
        productId: "p1",
        productName: "P1",
        brand: "B1",
        channel: "inside",
        qty: 3,
        beerPrice: 90000,
        addOn: 0,
        depositPortion: 0,
        depositWaived: false,
        offerDiscount: 0,
        unitPrice: 90000,
        total: 270000,
      },
      {
        id: "l2",
        productId: "p2",
        productName: "P2",
        brand: "B2",
        channel: "outside",
        qty: 1,
        beerPrice: 90000,
        addOn: 10000,
        depositPortion: 20000,
        depositWaived: false,
        offerDiscount: 0,
        unitPrice: 120000,
        total: 120000,
      },
    ];

    it("calculates order totals and applies bottle discount token", () => {
      // Subtotal = 270,000 + 120,000 = 390,000
      // Bottle discount = 20,000
      // Grand total = 370,000
      const totals = calcOrderTotals(lines, 20000);
      expect(totals.totalBeerAmount).toBe(370000); // (3 * 900) + (1 * 1000) = 3700
      expect(totals.totalDepositAmount).toBe(20000); // 1 * 200
      expect(totals.bottleDiscountAmount).toBe(20000);
      expect(totals.grandTotal).toBe(370000);
    });

    it("validates split payments correctly", () => {
      const validSplits = [
        { method: "cash" as const, amount: 200000 },
        { method: "card" as const, amount: 170000 },
      ];
      expect(validateSplitPayment(370000, validSplits).valid).toBe(true);

      const invalidSplits = [
        { method: "cash" as const, amount: 200000 },
        { method: "card" as const, amount: 100000 }, // short 70,000
      ];
      const res = validateSplitPayment(370000, invalidSplits);
      expect(res.valid).toBe(false);
      expect(res.difference).toBe(70000);
    });
  });
});
