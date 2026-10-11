/**
 * Report registry — every switchable report.
 *
 * WHY: Super Admin console renders report switches from this list.
 * Each report is individually switchable per client within the "reports" module.
 */
import type { ModuleId } from "./modules";

export type ReportId =
  | "sales"
  | "supplies"
  | "profitLoss"
  | "cashFlow"
  | "cardCheck"
  | "stock"
  | "reconciliation"
  | "deposits"
  | "credit"
  | "offersFreeDrinks"
  | "settingsHistory";

export interface ReportDefinition {
  id: ReportId;
  title: string;
  description: string;
  /** Which module must be enabled for this report to appear. */
  requiredModule: ModuleId;
  /** Whether this report has a compare-to-previous-period feature. */
  supportsComparison: boolean;
  /** Whether CSV export is available. Always true — kept explicit for future control. */
  hasCsvExport: boolean;
}

export const REPORT_REGISTRY: readonly ReportDefinition[] = [
  {
    id: "sales",
    title: "Sales Report",
    description:
      "Sales by product, brand, channel, payment method, cashier, weekday, and hour.",
    requiredModule: "reports",
    supportsComparison: true,
    hasCsvExport: true,
  },
  {
    id: "supplies",
    title: "Supplies Report",
    description: "Purchases by supplier and brand, cost changes over time, spend per period.",
    requiredModule: "stock",
    supportsComparison: true,
    hasCsvExport: true,
  },
  {
    id: "profitLoss",
    title: "Profit & Loss",
    description:
      "Net sales, COGS, gross margin, expenses, net profit per day or month. Monthly figures include card fees.",
    requiredModule: "reports",
    supportsComparison: true,
    hasCsvExport: true,
  },
  {
    id: "cashFlow",
    title: "Cash Flow",
    description: "Cash in and out by category, opening and closing balance.",
    requiredModule: "expenses",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "cardCheck",
    title: "Month-End Card Check",
    description:
      "Card sales recorded vs bank statement gross, the difference, and bank fees.",
    requiredModule: "monthEndCards",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "stock",
    title: "Stock Report",
    description:
      "Current valuation, movement history, breakage, and dead stock (no sales in 14 days).",
    requiredModule: "stock",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "reconciliation",
    title: "Reconciliation Variances",
    description:
      "Cash variance per day, per cashier, repeated patterns, and anomaly flags.",
    requiredModule: "dayClose",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "deposits",
    title: "Deposits Report",
    description:
      "Bottles still out, refunds vs discounts, deposits waived and by whom, refund exposure.",
    requiredModule: "deposits",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "credit",
    title: "Credit (Tabs) Report",
    description:
      "Who owes what, limit utilisation, due dates, overdue tabs, extensions, and ageing.",
    requiredModule: "tabs",
    supportsComparison: false,
    hasCsvExport: true,
  },
  {
    id: "offersFreeDrinks",
    title: "Offers & Free Drinks",
    description:
      "Sales and margin during happy hour, discounts given, staff and free drinks at cost with approver.",
    requiredModule: "offers",
    supportsComparison: true,
    hasCsvExport: true,
  },
  {
    id: "settingsHistory",
    title: "Settings Change History",
    description:
      "Every price, deposit, offer, and setting change with date, old value, new value, and who made it.",
    requiredModule: "reports",
    supportsComparison: false,
    hasCsvExport: true,
  },
] as const;

export function getReport(id: ReportId): ReportDefinition {
  const report = REPORT_REGISTRY.find((r) => r.id === id);
  if (!report) throw new Error(`Report "${id}" not found in registry`);
  return report;
}
