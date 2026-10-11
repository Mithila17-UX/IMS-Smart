/**
 * Dashboard tile registry.
 *
 * WHY: Super Admin console renders tile switches from this list.
 * Client admins can hide or reorder tiles within what the super admin allows.
 * The dashboard renders tiles from this registry, checking entitlements per tile.
 */
import type { ModuleId } from "./modules";

export type TileId =
  | "cashToday"         // Today's cash sales (main KPI)
  | "salesToday"        // Total sales today (all methods)
  | "cashYesterday"     // Yesterday's cash sales
  | "salesYesterday"    // Yesterday's total sales + net profit
  | "stockNow"          // Stock per product (units, value, low-stock, days of cover)
  | "netProfitToday"    // Estimated net profit today
  | "cashVariance"      // Live cash variance for the open day
  | "tabsOwed"          // Tabs owed with limit use and overdue flags
  | "refundExposure"    // Bottles still out × current deposit rate
  | "salesChart7d"      // 7-day sales trend chart
  | "topSellers"        // Top-selling products by revenue
  | "reorderAlerts"     // Products at or below reorder point
  | "depositsWaived"    // Deposits waived today and by whom
  | "pendingRequests";  // Pending admin approval requests

export interface TileDefinition {
  id: TileId;
  title: string;
  description: string;
  /** Which module must be enabled for this tile to be shown. */
  requiredModule: ModuleId;
  /** Default display order (lower = higher priority). */
  defaultOrder: number;
}

export const TILE_REGISTRY: readonly TileDefinition[] = [
  {
    id: "cashToday",
    title: "Cash Today",
    description: "Today's cash sales since the business day opened. Main KPI.",
    requiredModule: "dashboard",
    defaultOrder: 1,
  },
  {
    id: "salesToday",
    title: "Sales Today",
    description: "Total sales today broken down by payment method.",
    requiredModule: "dashboard",
    defaultOrder: 2,
  },
  {
    id: "cashYesterday",
    title: "Cash Yesterday",
    description: "Yesterday's final cash sales.",
    requiredModule: "dashboard",
    defaultOrder: 3,
  },
  {
    id: "salesYesterday",
    title: "Yesterday Summary",
    description: "Yesterday's total sales and net profit.",
    requiredModule: "dashboard",
    defaultOrder: 4,
  },
  {
    id: "netProfitToday",
    title: "Net Profit Estimate",
    description: "Estimated net profit today: net sales − COGS − expenses (excluding card fees).",
    requiredModule: "dashboard",
    defaultOrder: 5,
  },
  {
    id: "cashVariance",
    title: "Cash Variance",
    description: "Live difference between expected and counted cash for the open day.",
    requiredModule: "dayClose",
    defaultOrder: 6,
  },
  {
    id: "stockNow",
    title: "Stock Now",
    description: "Current stock per product: units, value, low-stock pill, days of cover.",
    requiredModule: "stock",
    defaultOrder: 7,
  },
  {
    id: "tabsOwed",
    title: "Tabs Owed",
    description: "Total owed on tabs, with overdue flags and limit utilisation.",
    requiredModule: "tabs",
    defaultOrder: 8,
  },
  {
    id: "refundExposure",
    title: "Refund Exposure",
    description: "Bottles still out × current deposit rate. Informational only.",
    requiredModule: "deposits",
    defaultOrder: 9,
  },
  {
    id: "salesChart7d",
    title: "7-Day Sales Chart",
    description: "Bar chart of total sales for the last 7 business days.",
    requiredModule: "dashboard",
    defaultOrder: 10,
  },
  {
    id: "topSellers",
    title: "Top Sellers",
    description: "Top 5 products by revenue for the current period.",
    requiredModule: "dashboard",
    defaultOrder: 11,
  },
  {
    id: "reorderAlerts",
    title: "Reorder Alerts",
    description: "Products at or below their reorder point.",
    requiredModule: "forecastReorder",
    defaultOrder: 12,
  },
  {
    id: "depositsWaived",
    title: "Deposits Waived Today",
    description: "Count and value of deposits waived today, with cashier name.",
    requiredModule: "deposits",
    defaultOrder: 13,
  },
  {
    id: "pendingRequests",
    title: "Pending Requests",
    description: "Admin approval requests awaiting review.",
    requiredModule: "adminRequests",
    defaultOrder: 14,
  },
] as const;

export function getTile(id: TileId): TileDefinition {
  const tile = TILE_REGISTRY.find((t) => t.id === id);
  if (!tile) throw new Error(`Tile "${id}" not found in registry`);
  return tile;
}
