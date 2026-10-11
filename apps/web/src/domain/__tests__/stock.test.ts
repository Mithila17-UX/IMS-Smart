import { describe, it, expect } from "vitest";
import {
  calcStockOnHand,
  calcStockAt,
  calcStockSummary,
  calcNewWAC,
  replayWAC,
  calcBottlesOut,
  calcBottlesStillOut,
  calcReorderPoint,
} from "../stock";
import type { StockMovement } from "@/data/schemas/stockMovement.schema";

describe("stock domain logic", () => {
  const sampleMovements: StockMovement[] = [
    {
      id: "m1",
      productId: "prod-1",
      type: "purchase",
      qty: 100,
      unitPrice: 50000, // Rs 500
      cashierId: "admin",
      at: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "m2",
      productId: "prod-1",
      type: "sale",
      channel: "inside",
      qty: -20,
      unitPrice: 90000,
      cashierId: "cashier-1",
      at: "2026-01-02T15:00:00.000Z",
    },
    {
      id: "m3",
      productId: "prod-1",
      type: "sale",
      channel: "outside",
      qty: -15,
      unitPrice: 120000,
      depositPortion: 20000,
      depositWaived: false,
      cashierId: "cashier-1",
      at: "2026-01-03T18:00:00.000Z",
    },
    {
      id: "m4",
      productId: "prod-1",
      type: "sale",
      channel: "outside",
      qty: -5,
      unitPrice: 100000,
      depositWaived: true, // Deposit was waived
      cashierId: "cashier-2",
      at: "2026-01-04T12:00:00.000Z",
    },
    {
      id: "m5",
      productId: "prod-1",
      type: "wastage",
      qty: -2,
      reason: "Broken bottle in cellar",
      cashierId: "admin",
      at: "2026-01-05T09:00:00.000Z",
    },
    {
      id: "m6",
      productId: "prod-1",
      type: "purchase",
      qty: 50,
      unitPrice: 56000, // Rs 560
      cashierId: "admin",
      at: "2026-01-06T10:00:00.000Z",
    },
  ];

  it("calculates current stock on hand from ledger", () => {
    // 100 - 20 - 15 - 5 - 2 + 50 = 108
    expect(calcStockOnHand(sampleMovements)).toBe(108);
  });

  it("calculates stock on hand at historical point in time", () => {
    // Before any movements
    expect(calcStockAt(sampleMovements, "2025-12-31T00:00:00.000Z")).toBe(0);

    // After first purchase
    expect(calcStockAt(sampleMovements, "2026-01-01T12:00:00.000Z")).toBe(100);

    // After inside and outside sales
    expect(calcStockAt(sampleMovements, "2026-01-03T20:00:00.000Z")).toBe(65);
  });

  it("calculates stock summary with reorder detection and days of cover", () => {
    const summary = calcStockSummary("prod-1", sampleMovements, 50, 10);
    expect(summary.stockOnHand).toBe(108);
    expect(summary.reorderPoint).toBe(50);
    expect(summary.isLow).toBe(false);
    expect(summary.daysOfCover).toBe(10.8);

    // When stock is below reorder point
    const lowSummary = calcStockSummary("prod-1", sampleMovements, 150, 10);
    expect(lowSummary.isLow).toBe(true);

    // When avgDailySales is 0
    const zeroSalesSummary = calcStockSummary("prod-1", sampleMovements, 50, 0);
    expect(zeroSalesSummary.daysOfCover).toBe(Infinity);
  });

  describe("WAC (Weighted Average Cost)", () => {
    it("computes new WAC correctly", () => {
      // 100 units @ Rs 500, receive 50 units @ Rs 560
      // (100 * 50000 + 50 * 56000) / 150 = (5,000,000 + 2,800,000) / 150 = 7,800,000 / 150 = 52,000
      const newWac = calcNewWAC(100, 50000, 50, 56000);
      expect(newWac).toBe(52000); // Rs 520.00
    });

    it("handles zero or empty initial stock", () => {
      const initialWac = calcNewWAC(0, 0, 48, 60000);
      expect(initialWac).toBe(60000);
    });

    it("replays WAC accurately through movement history", () => {
      // m1: 100 units @ 50000 -> wac 50000, stock 100
      // sales & wastage: stock drops to 58, wac remains 50000
      // m6: 50 units @ 56000 -> (58 * 50000 + 50 * 56000) / 108 = (2,900,000 + 2,800,000) / 108 = 5,700,000 / 108 = 52777
      const replayed = replayWAC(sampleMovements);
      expect(replayed).toBe(52777); // ~Rs 527.77
    });
  });

  describe("bottle deposit return validation", () => {
    it("calculates outside bottles sold with deposit", () => {
      // m3: 15 outside bottles with deposit
      // m4: 5 outside bottles with deposit waived (does NOT count as bottle out)
      expect(calcBottlesOut(sampleMovements)).toBe(15);
    });

    it("calculates bottles still outstanding", () => {
      // 15 bottles out, 6 already returned -> 9 still out
      expect(calcBottlesStillOut(sampleMovements, 6)).toBe(9);

      // Return count cannot make still out negative
      expect(calcBottlesStillOut(sampleMovements, 20)).toBe(0);
    });
  });

  describe("reorder point calculation", () => {
    it("calculates safety stock and reorder point", () => {
      // avgDailySales = 20, stdDev = 5, leadDays = 4
      // safetyStock = 1.65 * 5 * sqrt(4) = 1.65 * 5 * 2 = 16.5
      // reorderPoint = ceil(20 * 4 + 16.5) = ceil(80 + 16.5) = 97
      const rop = calcReorderPoint(20, 5, 4);
      expect(rop).toBe(97);
    });

    it("returns 0 when lead days or sales are zero or negative", () => {
      expect(calcReorderPoint(0, 5, 4)).toBe(0);
      expect(calcReorderPoint(20, 5, 0)).toBe(0);
    });
  });
});
