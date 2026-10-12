import { describe, it, expect } from "vitest";
import {
  validateBottleReturn,
  calcReturnRefund,
  buildDiscountToken,
} from "../returns";

describe("returns domain logic", () => {
  describe("validateBottleReturn", () => {
    it("validates successfully when return quantity is within outstanding bottles", () => {
      const res = validateBottleReturn(5, 12);
      expect(res.valid).toBe(true);
      expect(res.maxAllowed).toBe(12);
      expect(res.error).toBeUndefined();
    });

    it("rejects return when no bottles are outstanding for the product", () => {
      const res = validateBottleReturn(2, 0);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("No returnable bottles are currently outstanding");
    });

    it("rejects return exceeding bottles outstanding", () => {
      const res = validateBottleReturn(15, 10);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds the 10 bottles currently outstanding");
    });

    it("rejects non-positive quantities", () => {
      expect(validateBottleReturn(0, 10).valid).toBe(false);
      expect(validateBottleReturn(-3, 10).valid).toBe(false);
    });
  });

  describe("calcReturnRefund", () => {
    it("calculates refund amount in cents", () => {
      // 5 bottles @ Rs 200 (20000 cents) = Rs 1,000 (100000 cents)
      expect(calcReturnRefund(5, 20000)).toBe(100000);
      expect(calcReturnRefund(0, 20000)).toBe(0);
    });
  });

  describe("buildDiscountToken", () => {
    it("creates a single-use discount token structure", () => {
      const token = buildDiscountToken("token-123", 20000, "2026-01-15");
      expect(token).toEqual({
        tokenId: "token-123",
        amount: 20000,
        businessDate: "2026-01-15",
        usedInOrderId: null,
      });
    });
  });
});
