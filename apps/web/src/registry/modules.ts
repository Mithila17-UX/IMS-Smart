/**
 * Module registry — the single source of truth for every feature module.
 *
 * WHY this exists:
 *   The Super Admin console renders module switches directly from this list.
 *   The entitlement guard checks moduleId against this registry.
 *   Firestore security rules reference the moduleId string.
 *   Adding a feature = adding an entry here + rules + a feature folder.
 *   Nothing else needs to change.
 */

/** Every moduleId must be a stable string key — never rename after launch. */
export type ModuleId =
  | "products"         // Products and categories — core, always on
  | "stock"            // Stock and supplies (deliveries, stock ledger)
  | "liveOrders"       // Live tally and order-based sales
  | "dailyEntry"       // Daily manual sales entry
  | "deposits"         // Bottle deposit tracking and returns
  | "tabs"             // Customer credit / tab accounts
  | "offers"           // Happy hour and scheduled offers
  | "adminRequests"    // Cashier → admin approval workflow
  | "expenses"         // Bar expenses and cash ledger
  | "dayClose"         // Day close and reconciliation
  | "monthEndCards"    // Month-end bank statement and card check
  | "forecastReorder"  // Demand forecast and reorder suggestions
  | "reports"          // Reports module (each report switchable individually)
  | "dashboard";       // Dashboard tiles (each tile switchable individually)

/** A registered feature module. */
export interface ModuleDefinition {
  /** Stable unique identifier. Used in Firestore security rules. */
  id: ModuleId;
  /** Human-readable name shown in the Super Admin console. */
  title: string;
  /** Short description for the console. */
  description: string;
  /**
   * Other modules that must be enabled first.
   * The Super Admin console validates this before saving and offers to enable missing ones.
   */
  dependencies: ModuleId[];
  /**
   * Firestore collections this module writes to.
   * Used by the Super Admin console to show "turning this off will block writes to: ..."
   */
  writesCollections: string[];
  /**
   * If true, this module cannot be switched off for any client.
   * Products is the only core module — everything else derives from it.
   */
  isCoreModule?: boolean;
}

/**
 * The master module registry.
 * Order here is the default display order in the Super Admin console.
 */
export const MODULE_REGISTRY: readonly ModuleDefinition[] = [
  {
    id: "products",
    title: "Products & Categories",
    description: "The product catalogue. Required by every other module.",
    dependencies: [],
    writesCollections: ["categories", "products", "priceVersions", "depositVersions"],
    isCoreModule: true,
  },
  {
    id: "stock",
    title: "Stock & Supplies",
    description: "Supplier deliveries, stock ledger, and weighted average cost tracking.",
    dependencies: ["products"],
    writesCollections: ["suppliers", "purchases", "stockMovements"],
  },
  {
    id: "liveOrders",
    title: "Live Tally & Orders",
    description:
      "Order-based sales entry with add-item and close-order pop-ups. Primary sales mode.",
    dependencies: ["products"],
    writesCollections: ["orders", "stockMovements"],
  },
  {
    id: "dailyEntry",
    title: "Daily Manual Sales Entry",
    description:
      "Type the day's units per product at close. Fallback or sole sales mode for some clients.",
    dependencies: ["products"],
    writesCollections: ["stockMovements"],
  },
  {
    id: "deposits",
    title: "Bottle Deposits",
    description:
      "Government deposit tracking: outside bottle sales, customer returns (cash refund or discount token), deposit rate versioning.",
    dependencies: ["liveOrders"],
    writesCollections: ["bottleReturns", "depositVersions"],
  },
  {
    id: "tabs",
    title: "Tabs (Customer Credit)",
    description:
      "Customer tab accounts with credit limits, due dates, over-limit approval, and tab payment recording.",
    dependencies: ["liveOrders"],
    writesCollections: ["customers", "dueExtensions"],
  },
  {
    id: "offers",
    title: "Offers & Happy Hour",
    description:
      "Time-based offers with flexible rules (fixed price, amount off, percent off). Applies automatically during active windows.",
    dependencies: ["liveOrders"],
    writesCollections: ["offers"],
  },
  {
    id: "adminRequests",
    title: "Admin Request Inbox",
    description:
      "Cashiers send real-time requests for discounts, free pours, and staff drinks; admin approves or rejects.",
    dependencies: ["liveOrders"],
    writesCollections: ["approvalRequests"],
  },
  {
    id: "expenses",
    title: "Expenses & Cash Ledger",
    description:
      "Bar expenses, cash in/out, opening and closing float. Supplier payments recorded separately here.",
    dependencies: ["products"],
    writesCollections: ["cashEntries", "expenseCategories"],
  },
  {
    id: "dayClose",
    title: "Day Close & Reconciliation",
    description:
      "Stock, empties, and cash reconciliation. Locks the day. Requires stock plus at least one sales mode.",
    dependencies: ["stock", "liveOrders"], // liveOrders OR dailyEntry — validated at runtime
    writesCollections: ["shifts", "reconciliations"],
  },
  {
    id: "monthEndCards",
    title: "Month-End Card Check",
    description:
      "Manual bank statement entry. Compares recorded card sales with bank statement. Feeds card fees into monthly P&L.",
    dependencies: [],
    writesCollections: ["bankStatements", "monthCardChecks"],
  },
  {
    id: "forecastReorder",
    title: "Forecast & Reorder",
    description:
      "7-day demand forecast, reorder point calculation, days-of-cover, and ABC product classification.",
    dependencies: ["stock", "dailyEntry"],
    writesCollections: [],
  },
  {
    id: "reports",
    title: "Reports",
    description:
      "Date-range reports with CSV export. Each individual report is switchable within this module.",
    dependencies: ["products"],
    writesCollections: [],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "KPI tiles, charts, and alerts. Each tile is switchable individually. Loads from daily summaries, never the raw ledger.",
    dependencies: ["products"],
    writesCollections: [],
  },
] as const;

/** Lookup a module definition by ID. Throws if not found (programming error). */
export function getModule(id: ModuleId): ModuleDefinition {
  const mod = MODULE_REGISTRY.find((m) => m.id === id);
  if (!mod) throw new Error(`Module "${id}" not found in registry`);
  return mod;
}

/** All module IDs as a set, for O(1) validation. */
export const ALL_MODULE_IDS = new Set<ModuleId>(MODULE_REGISTRY.map((m) => m.id));
