import { describe, it, expect } from "vitest";
import {
  getPriceAt,
  getCurrentPrice,
  calcUnitPrice,
  getPriceHistory,
  getDepositAt,
  getCurrentDeposit,
  getDepositHistory,
} from "../prices";
import type { PriceVersion, DepositVersion } from "@/data/schemas/product.schema";

describe("prices domain logic", () => {
  const versions: PriceVersion[] = [
    {
      productId: "prod-1",
      channel: "inside",
      beerPrice: 85000, // Rs 850
      addOn: 0,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin",
    },
    {
      productId: "prod-1",
      channel: "inside",
      beerPrice: 90000, // Rs 900
      addOn: 0,
      effectiveFrom: "2026-02-01T00:00:00.000Z",
      changedBy: "admin",
    },
    {
      productId: "prod-1",
      channel: "outside",
      beerPrice: 90000,
      addOn: 10000, // Rs 100 addon
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin",
    },
  ];

  it("resolves the correct price version at historical timestamps", () => {
    // Before first version
    expect(getPriceAt("prod-1", "inside", versions, "2025-12-31T23:59:59.000Z")).toBeNull();

    // In January 2026
    const janPrice = getPriceAt("prod-1", "inside", versions, "2026-01-15T12:00:00.000Z");
    expect(janPrice?.beerPrice).toBe(85000);

    // In February 2026 onwards
    const febPrice = getPriceAt("prod-1", "inside", versions, "2026-02-15T12:00:00.000Z");
    expect(febPrice?.beerPrice).toBe(90000);
  });

  it("gets current price", () => {
    const current = getCurrentPrice("prod-1", "inside", versions);
    expect(current?.beerPrice).toBe(90000);
  });

  it("calculates unit price with and without deposit", () => {
    // Inside sale - no deposit
    const insideRes = calcUnitPrice(
      "prod-1",
      "inside",
      versions,
      20000, // Rs 200 deposit rate
      "2026-02-15T12:00:00.000Z",
      false, // inside skips deposit
    );
    expect(insideRes).toEqual({
      beerPrice: 90000,
      addOn: 0,
      deposit: 0,
      total: 90000,
    });

    // Outside sale with deposit included
    const outsideWithDep = calcUnitPrice(
      "prod-1",
      "outside",
      versions,
      20000,
      "2026-02-15T12:00:00.000Z",
      true,
    );
    expect(outsideWithDep).toEqual({
      beerPrice: 90000,
      addOn: 10000,
      deposit: 20000,
      total: 120000, // 900 + 100 + 200 = 1200
    });

    // Outside sale with deposit waived by cashier
    const outsideWaived = calcUnitPrice(
      "prod-1",
      "outside",
      versions,
      20000,
      "2026-02-15T12:00:00.000Z",
      false,
    );
    expect(outsideWaived).toEqual({
      beerPrice: 90000,
      addOn: 10000,
      deposit: 0,
      total: 100000, // 900 + 100 = 1000
    });

    // Non-existent product
    expect(calcUnitPrice("unknown", "inside", versions, 0, "2026-02-15T12:00:00.000Z", false)).toBeNull();
  });

  it("returns price history sorted descending by effectiveFrom", () => {
    const history = getPriceHistory("prod-1", "inside", versions);
    expect(history).toHaveLength(2);
    expect(history[0]!.beerPrice).toBe(90000);
    expect(history[1]!.beerPrice).toBe(85000);
  });

  describe("deposit version resolution", () => {
    const depositVersions: DepositVersion[] = [
      {
        categoryId: "cat-beer",
        amount: 15000, // Rs 150
        effectiveFrom: "2025-01-01T00:00:00.000Z",
        changedBy: "admin",
      },
      {
        categoryId: "cat-beer",
        amount: 20000, // Rs 200
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        changedBy: "admin",
      },
    ];

    it("resolves deposit at point in time", () => {
      expect(getDepositAt("cat-beer", depositVersions, "2024-12-31T00:00:00.000Z")).toBe(0);
      expect(getDepositAt("cat-beer", depositVersions, "2025-06-01T00:00:00.000Z")).toBe(15000);
      expect(getDepositAt("cat-beer", depositVersions, "2026-03-01T00:00:00.000Z")).toBe(20000);
    });

    it("gets current deposit", () => {
      expect(getCurrentDeposit("cat-beer", depositVersions)).toBe(20000);
    });

    it("returns deposit history sorted descending", () => {
      const hist = getDepositHistory("cat-beer", depositVersions);
      expect(hist).toHaveLength(2);
      expect(hist[0]!.amount).toBe(20000);
      expect(hist[1]!.amount).toBe(15000);
    });
  });
});
