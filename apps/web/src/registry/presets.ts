/**
 * Client presets — a preset is a named set of module/tile/report switches.
 *
 * WHY: The Super Admin console applies a preset when creating a new client,
 * then lets the super admin adjust individual switches. Presets are also
 * stored in Firestore (presets/{presetId}) so new ones can be saved from the console.
 * These three are the built-in, code-defined defaults that are seeded on first deploy.
 */
import type { ModuleId } from "./modules";
import type { TileId } from "./tiles";
import type { ReportId } from "./reports";
import type { SettingsTabId } from "./settingsTabs";

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  modules: Partial<Record<ModuleId, boolean>>;
  tiles: Partial<Record<TileId, boolean>>;
  reports: Partial<Record<ReportId, boolean>>;
  settingsTabs: Partial<Record<SettingsTabId, boolean>>;
}

/**
 * Built-in presets shipped with the app.
 * These are seeded into Firestore by the seed script and used as templates.
 */
export const BUILT_IN_PRESETS: readonly PresetDefinition[] = [
  {
    id: "full-bar",
    name: "Full Bar",
    description:
      "Everything enabled: live tally, deposits, tabs, offers, day close, reports, and forecasting.",
    isBuiltIn: true,
    modules: {
      products: true,
      stock: true,
      liveOrders: true,
      dailyEntry: true,
      deposits: true,
      tabs: true,
      offers: true,
      adminRequests: true,
      expenses: true,
      dayClose: true,
      monthEndCards: true,
      forecastReorder: true,
      reports: true,
      dashboard: true,
    },
    tiles: {
      cashToday: true,
      salesToday: true,
      cashYesterday: true,
      salesYesterday: true,
      netProfitToday: true,
      cashVariance: true,
      stockNow: true,
      tabsOwed: true,
      refundExposure: true,
      salesChart7d: true,
      topSellers: true,
      reorderAlerts: true,
      depositsWaived: true,
      pendingRequests: true,
    },
    reports: {
      sales: true,
      supplies: true,
      profitLoss: true,
      cashFlow: true,
      cardCheck: true,
      stock: true,
      reconciliation: true,
      deposits: true,
      credit: true,
      offersFreeDrinks: true,
      settingsHistory: true,
    },
    settingsTabs: {
      business: true,
      prices: true,
      deposits: true,
      happyHour: true,
      salesScreen: true,
      credit: true,
      payments: true,
      monthEnd: true,
      approvals: true,
      dayClose: true,
      stock: true,
      expenses: true,
      productsCategories: true,
      dashboardLayout: true,
      users: true,
      data: true,
    },
  },
  {
    id: "stock-and-daily-sales",
    name: "Stock & Daily Sales",
    description:
      "Stock tracking with manual daily sales entry. No live tally, deposits, tabs, or offers.",
    isBuiltIn: true,
    modules: {
      products: true,
      stock: true,
      liveOrders: false,
      dailyEntry: true,
      deposits: false,
      tabs: false,
      offers: false,
      adminRequests: false,
      expenses: false,
      dayClose: false,
      monthEndCards: false,
      forecastReorder: false,
      reports: true,
      dashboard: true,
    },
    tiles: {
      cashToday: false,
      salesToday: true,
      cashYesterday: false,
      salesYesterday: true,
      netProfitToday: false,
      cashVariance: false,
      stockNow: true,
      tabsOwed: false,
      refundExposure: false,
      salesChart7d: true,
      topSellers: true,
      reorderAlerts: false,
      depositsWaived: false,
      pendingRequests: false,
    },
    reports: {
      sales: true,
      supplies: true,
      profitLoss: false,
      cashFlow: false,
      cardCheck: false,
      stock: true,
      reconciliation: false,
      deposits: false,
      credit: false,
      offersFreeDrinks: false,
      settingsHistory: false,
    },
    settingsTabs: {
      business: true,
      prices: true,
      deposits: false,
      happyHour: false,
      salesScreen: false,
      credit: false,
      payments: false,
      monthEnd: false,
      approvals: false,
      dayClose: false,
      stock: true,
      expenses: false,
      productsCategories: true,
      dashboardLayout: true,
      users: true,
      data: true,
    },
  },
  {
    id: "sales-and-cash",
    name: "Sales & Cash",
    description:
      "Live tally, daily entry, expenses, day close, and the core sales/cash flow/profit reports.",
    isBuiltIn: true,
    modules: {
      products: true,
      stock: true,
      liveOrders: true,
      dailyEntry: true,
      deposits: false,
      tabs: false,
      offers: false,
      adminRequests: false,
      expenses: true,
      dayClose: true,
      monthEndCards: false,
      forecastReorder: false,
      reports: true,
      dashboard: true,
    },
    tiles: {
      cashToday: true,
      salesToday: true,
      cashYesterday: true,
      salesYesterday: true,
      netProfitToday: true,
      cashVariance: true,
      stockNow: true,
      tabsOwed: false,
      refundExposure: false,
      salesChart7d: true,
      topSellers: true,
      reorderAlerts: false,
      depositsWaived: false,
      pendingRequests: false,
    },
    reports: {
      sales: true,
      supplies: false,
      profitLoss: true,
      cashFlow: true,
      cardCheck: false,
      stock: false,
      reconciliation: false,
      deposits: false,
      credit: false,
      offersFreeDrinks: false,
      settingsHistory: false,
    },
    settingsTabs: {
      business: true,
      prices: true,
      deposits: false,
      happyHour: false,
      salesScreen: true,
      credit: false,
      payments: true,
      monthEnd: false,
      approvals: false,
      dayClose: true,
      stock: false,
      expenses: true,
      productsCategories: true,
      dashboardLayout: true,
      users: true,
      data: true,
    },
  },
] as const;

export function getPreset(id: string): PresetDefinition | undefined {
  return BUILT_IN_PRESETS.find((p) => p.id === id);
}
