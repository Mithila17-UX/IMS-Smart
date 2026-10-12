import { describe, it, expect } from "vitest";
import {
  calcCreditAvailable,
  isOverCreditLimit,
  calcCustomerDueDate,
  isTabOverdue,
} from "../credit";

describe("credit domain logic", () => {
  it("calculates available credit", () => {
    // Limit Rs. 5,000 (500000 cents), Balance Rs. 1,800 (180000 cents)
    expect(calcCreditAvailable(500000, 180000)).toBe(320000);
  });

  it("detects when a tab sale would exceed limit", () => {
    // Limit Rs. 5,000, Balance Rs. 4,500, new sale Rs. 600 -> Total 5,100 -> Over limit!
    expect(isOverCreditLimit(500000, 450000, 60000)).toBe(true);

    // Limit Rs. 5,000, Balance Rs. 4,500, new sale Rs. 500 -> Exactly 5,000 -> Not over limit
    expect(isOverCreditLimit(500000, 450000, 50000)).toBe(false);
  });

  describe("calcCustomerDueDate", () => {
    const oldestDate = "2026-01-01T14:30:00.000Z";

    it("uses default due days when no override exists", () => {
      // 30 days from Jan 1 = Jan 31
      const due = calcCustomerDueDate(oldestDate, 30);
      expect(due).toBe("2026-01-31");
    });

    it("uses customer dueDaysOverride when present", () => {
      // 14 days from Jan 1 = Jan 15
      const due = calcCustomerDueDate(oldestDate, 30, 14);
      expect(due).toBe("2026-01-15");
    });

    it("prioritizes latestExtensionDate if admin extended it", () => {
      const due = calcCustomerDueDate(oldestDate, 30, 14, "2026-02-15");
      expect(due).toBe("2026-02-15");
    });

    it("returns null when no oldest unpaid date exists", () => {
      expect(calcCustomerDueDate(null, 30)).toBeNull();
    });
  });

  describe("isTabOverdue", () => {
    it("flags overdue when due date has passed", () => {
      expect(isTabOverdue("2026-01-15", "2026-01-16")).toBe(true);
      expect(isTabOverdue("2026-01-15", "2026-01-15")).toBe(false);
      expect(isTabOverdue("2026-01-15", "2026-01-14")).toBe(false);
      expect(isTabOverdue(null, "2026-01-16")).toBe(false);
    });
  });
});
