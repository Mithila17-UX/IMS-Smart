import { describe, it, expect } from "vitest";
import {
  isEnabled,
  isWritable,
  isBlocked,
  getMissingDependencies,
  isDayCloseDependencySatisfied,
  applyPreset,
  makeDefaultEntitlements,
  getStatusMessage,
  type ClientEntitlements,
} from "../entitlements";
import { MODULE_REGISTRY } from "@/registry/modules";
import { BUILT_IN_PRESETS } from "@/registry/presets";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeEntitlements(
  overrides: Partial<ClientEntitlements> = {},
): ClientEntitlements {
  return {
    status: "active",
    modules: {},
    tiles: {},
    reports: {},
    settingsTabs: {},
    maxUsers: 10,
    updatedAt: new Date().toISOString(),
    updatedBy: "test-user",
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// isEnabled
// ──────────────────────────────────────────────────────────────────────────────

describe("isEnabled", () => {
  it("returns false for a blocked client regardless of switch", () => {
    const e = makeEntitlements({
      status: "blocked",
      modules: { products: true, stock: true },
    });
    expect(isEnabled(e, "module", "products")).toBe(false);
    expect(isEnabled(e, "module", "stock")).toBe(false);
  });

  it("returns true for a module that is on for an active client", () => {
    const e = makeEntitlements({ modules: { products: true } });
    expect(isEnabled(e, "module", "products")).toBe(true);
  });

  it("returns false for a module that is explicitly off", () => {
    const e = makeEntitlements({ modules: { products: false } });
    expect(isEnabled(e, "module", "products")).toBe(false);
  });

  it("returns false for a module that is not in the map", () => {
    const e = makeEntitlements({ modules: {} });
    expect(isEnabled(e, "module", "stock")).toBe(false);
  });

  it("allows reads on a read_only client", () => {
    const e = makeEntitlements({
      status: "read_only",
      modules: { products: true },
    });
    // isEnabled reflects read access — write restriction is the caller's responsibility
    expect(isEnabled(e, "module", "products")).toBe(true);
  });

  it("blocks access on a read_only client for disabled modules", () => {
    const e = makeEntitlements({
      status: "read_only",
      modules: { deposits: false },
    });
    expect(isEnabled(e, "module", "deposits")).toBe(false);
  });

  it("checks tiles correctly", () => {
    const e = makeEntitlements({ tiles: { cashToday: true } });
    expect(isEnabled(e, "tile", "cashToday")).toBe(true);
    expect(isEnabled(e, "tile", "stockNow")).toBe(false);
  });

  it("checks reports correctly", () => {
    const e = makeEntitlements({ reports: { sales: true } });
    expect(isEnabled(e, "report", "sales")).toBe(true);
    expect(isEnabled(e, "report", "credit")).toBe(false);
  });

  it("checks settingsTabs correctly", () => {
    const e = makeEntitlements({ settingsTabs: { business: true } });
    expect(isEnabled(e, "settingsTab", "business")).toBe(true);
    expect(isEnabled(e, "settingsTab", "credit")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isWritable and isBlocked
// ──────────────────────────────────────────────────────────────────────────────

describe("isWritable", () => {
  it("is true for active clients", () => {
    expect(isWritable(makeEntitlements({ status: "active" }))).toBe(true);
  });

  it("is false for read_only clients", () => {
    expect(isWritable(makeEntitlements({ status: "read_only" }))).toBe(false);
  });

  it("is false for blocked clients", () => {
    expect(isWritable(makeEntitlements({ status: "blocked" }))).toBe(false);
  });
});

describe("isBlocked", () => {
  it("is true only for blocked clients", () => {
    expect(isBlocked(makeEntitlements({ status: "blocked" }))).toBe(true);
    expect(isBlocked(makeEntitlements({ status: "active" }))).toBe(false);
    expect(isBlocked(makeEntitlements({ status: "read_only" }))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getMissingDependencies
// ──────────────────────────────────────────────────────────────────────────────

describe("getMissingDependencies", () => {
  it("returns empty array when all dependencies are satisfied", () => {
    const modules = { products: true, liveOrders: true };
    const missing = getMissingDependencies(modules, "deposits", MODULE_REGISTRY);
    expect(missing).toEqual([]);
  });

  it("returns missing deps when a dependency is off", () => {
    const modules = { products: true }; // liveOrders missing
    const missing = getMissingDependencies(modules, "deposits", MODULE_REGISTRY);
    expect(missing).toContain("liveOrders");
  });

  it("returns multiple missing deps", () => {
    const modules = {}; // products and liveOrders both missing
    const missing = getMissingDependencies(modules, "deposits", MODULE_REGISTRY);
    expect(missing).toContain("liveOrders");
  });

  it("returns empty for products (no dependencies)", () => {
    const missing = getMissingDependencies({}, "products", MODULE_REGISTRY);
    expect(missing).toEqual([]);
  });

  it("returns empty for an unknown moduleId", () => {
    // Defensive: unknown ID should not throw
    const missing = getMissingDependencies(
      {},
      "unknownModule" as never,
      MODULE_REGISTRY,
    );
    expect(missing).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isDayCloseDependencySatisfied
// ──────────────────────────────────────────────────────────────────────────────

describe("isDayCloseDependencySatisfied", () => {
  it("returns true when stock + liveOrders are both on", () => {
    expect(
      isDayCloseDependencySatisfied({ stock: true, liveOrders: true }),
    ).toBe(true);
  });

  it("returns true when stock + dailyEntry are both on (no liveOrders)", () => {
    expect(
      isDayCloseDependencySatisfied({ stock: true, dailyEntry: true }),
    ).toBe(true);
  });

  it("returns false when stock is off", () => {
    expect(
      isDayCloseDependencySatisfied({ stock: false, liveOrders: true }),
    ).toBe(false);
  });

  it("returns false when neither liveOrders nor dailyEntry is on", () => {
    expect(isDayCloseDependencySatisfied({ stock: true })).toBe(false);
  });

  it("returns false with empty modules", () => {
    expect(isDayCloseDependencySatisfied({})).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// applyPreset
// ──────────────────────────────────────────────────────────────────────────────

describe("applyPreset", () => {
  it("applies full-bar preset — all modules on", () => {
    const base = makeDefaultEntitlements("super-admin");
    const preset = BUILT_IN_PRESETS.find((p) => p.id === "full-bar")!;
    const result = applyPreset(base, preset);

    expect(result.modules.products).toBe(true);
    expect(result.modules.deposits).toBe(true);
    expect(result.modules.tabs).toBe(true);
    expect(result.modules.offers).toBe(true);
    expect(result.modules.dayClose).toBe(true);
  });

  it("applies stock-and-daily-sales preset — liveOrders off", () => {
    const base = makeDefaultEntitlements("super-admin");
    const preset = BUILT_IN_PRESETS.find((p) => p.id === "stock-and-daily-sales")!;
    const result = applyPreset(base, preset);

    expect(result.modules.products).toBe(true);
    expect(result.modules.liveOrders).toBe(false);
    expect(result.modules.deposits).toBe(false);
  });

  it("does not mutate the base entitlements", () => {
    const base = makeDefaultEntitlements("super-admin");
    const preset = BUILT_IN_PRESETS[0]!;
    applyPreset(base, preset);
    // base.modules should still be empty
    expect(Object.keys(base.modules)).toHaveLength(0);
  });

  it("allows overriding after preset application", () => {
    const base = makeDefaultEntitlements("super-admin");
    const preset = BUILT_IN_PRESETS.find((p) => p.id === "stock-and-daily-sales")!;
    const withPreset = applyPreset(base, preset);

    // Manually turn on deposits after applying the preset
    const adjusted: ClientEntitlements = {
      ...withPreset,
      modules: { ...withPreset.modules, deposits: true },
    };
    expect(adjusted.modules.deposits).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Module off then on (data preservation)
// ──────────────────────────────────────────────────────────────────────────────

describe("module off then on (data preservation)", () => {
  it("isEnabled returns false when module is off, true when turned back on", () => {
    const e = makeEntitlements({ modules: { deposits: false } });
    expect(isEnabled(e, "module", "deposits")).toBe(false);

    const restored: ClientEntitlements = {
      ...e,
      modules: { ...e.modules, deposits: true },
    };
    expect(isEnabled(restored, "module", "deposits")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getStatusMessage
// ──────────────────────────────────────────────────────────────────────────────

describe("getStatusMessage", () => {
  it("shows a blocked message with reason when available", () => {
    const e = makeEntitlements({
      status: "blocked",
      statusReason: "Unpaid invoice",
    });
    expect(getStatusMessage(e)).toContain("Unpaid invoice");
  });

  it("shows a generic blocked message when no reason", () => {
    const e = makeEntitlements({ status: "blocked" });
    expect(getStatusMessage(e)).toContain("blocked");
  });

  it("shows a read-only message for read_only clients", () => {
    const e = makeEntitlements({ status: "read_only" });
    expect(getStatusMessage(e)).toContain("read-only");
  });

  it("shows a feature-not-enabled message for active clients", () => {
    const e = makeEntitlements({ status: "active" });
    expect(getStatusMessage(e, "Deposits")).toContain("Deposits");
  });
});
