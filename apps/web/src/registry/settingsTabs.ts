/**
 * Settings tab registry — the typed schema for every settings tab and field.
 *
 * WHY this matters:
 *   Adding a new setting = adding an entry here.
 *   The SettingsPage renders fields from this registry (no new screen needed).
 *   getSettingAt() in domain/settings.ts reads from settingVersions using the same keys.
 *   The Super Admin console controls which tabs appear per client.
 *
 * Field types:
 *   "boolean"   → Switch (on/off)
 *   "integer"   → Integer input (money as cents, quantities)
 *   "string"    → Text input
 *   "select"    → Dropdown from a fixed set of options
 *   "duration"  → Time in minutes (e.g. undo window)
 *   "time"      → HH:MM (e.g. business day cutoff)
 */
import type { ModuleId } from "./modules";

export type SettingsTabId =
  | "business"
  | "prices"
  | "deposits"
  | "happyHour"
  | "salesScreen"
  | "credit"
  | "payments"
  | "monthEnd"
  | "approvals"
  | "dayClose"
  | "stock"
  | "expenses"
  | "productsCategories"
  | "dashboardLayout"
  | "users"
  | "data";

export type SettingFieldType = "boolean" | "integer" | "string" | "select" | "duration" | "time";
export type SettingScope = "client"; // Future: "product" | "category" — for per-product settings

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingFieldDefinition {
  /** Stable key. Used in settingVersions collection and getSettingAt(). */
  key: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Longer description shown as helper text. */
  description: string;
  type: SettingFieldType;
  scope: SettingScope;
  /**
   * If true, changes are saved as a new version with effectiveFrom.
   * If false, the setting takes effect immediately and has no history.
   *
   * ALL money and stock-related fields must be versioned.
   */
  versioned: boolean;
  /** For "select" type: the allowed values. */
  options?: SettingOption[];
  /** Default value used when no version exists yet. */
  defaultValue: boolean | number | string;
  /** Minimum value for "integer" type. */
  min?: number;
  /** Maximum value for "integer" type. */
  max?: number;
  /** Warn the admin if the new value differs from the old by more than this %. */
  warnThresholdPercent?: number;
}

export interface SettingsTabDefinition {
  id: SettingsTabId;
  title: string;
  description: string;
  /** Which module must be enabled for this tab to appear. Undefined = always shown. */
  requiredModule?: ModuleId;
  fields: SettingFieldDefinition[];
}

export const SETTINGS_TAB_REGISTRY: readonly SettingsTabDefinition[] = [
  {
    id: "business",
    title: "Business",
    description: "Business name, hours, timezone, and locale.",
    fields: [
      {
        key: "businessName",
        label: "Business Name",
        description: "Displayed in the app header and reports.",
        type: "string",
        scope: "client",
        versioned: false,
        defaultValue: "",
      },
      {
        key: "openingTime",
        label: "Opening Time",
        description: "Time the business day opens (HH:MM, 24-hour).",
        type: "time",
        scope: "client",
        versioned: false,
        defaultValue: "09:00",
      },
      {
        key: "closingTime",
        label: "Closing Time",
        description: "Time the business day closes (HH:MM, 24-hour).",
        type: "time",
        scope: "client",
        versioned: false,
        defaultValue: "23:00",
      },
      {
        key: "businessDayCutoff",
        label: "Business Day Cutoff",
        description:
          "Sales after midnight but before this time count toward the previous business day. Default 04:00.",
        type: "time",
        scope: "client",
        versioned: false,
        defaultValue: "04:00",
      },
      {
        key: "timezone",
        label: "Timezone",
        description: "IANA timezone for this client.",
        type: "string",
        scope: "client",
        versioned: false,
        defaultValue: "Asia/Colombo",
      },
      {
        key: "currency",
        label: "Currency Code",
        description: "ISO 4217 currency code (e.g. LKR).",
        type: "string",
        scope: "client",
        versioned: false,
        defaultValue: "LKR",
      },
      {
        key: "locale",
        label: "Locale",
        description: "BCP 47 locale for number and date formatting (e.g. en-LK).",
        type: "string",
        scope: "client",
        versioned: false,
        defaultValue: "en-LK",
      },
    ],
  },
  {
    id: "deposits",
    title: "Deposits",
    description: "Bottle deposit switches and cashier pop-up behaviour.",
    requiredModule: "deposits",
    fields: [
      {
        key: "depositOnNormalSales",
        label: "Deposit on Normal Sales",
        description:
          "Apply bottle deposit by default on cash and card (non-tab) outside sales.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: true,
      },
      {
        key: "depositOnTabSales",
        label: "Deposit on Tab Sales",
        description: "Apply bottle deposit by default on outside sales closed as a tab.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: true,
      },
      {
        key: "depositPopupMode",
        label: "Deposit Pop-up Mode",
        description:
          "allow_change: cashier can tick/untick deposit per line. confirm_only: cashier can only confirm.",
        type: "select",
        scope: "client",
        versioned: true,
        options: [
          { value: "allow_change", label: "Allow change (cashier can tick or untick)" },
          { value: "confirm_only", label: "Confirm only (cashier confirms the default)" },
        ],
        defaultValue: "allow_change",
      },
      {
        key: "depositAccountingRule",
        label: "Deposit Accounting Rule",
        description:
          "default: unreturned deposits stay in sales; deducted: refunds and discounts deducted on the day given.",
        type: "select",
        scope: "client",
        versioned: true,
        options: [
          {
            value: "default",
            label: "Default (refund/discount deducted on day given; unreturned stays in sales)",
          },
        ],
        defaultValue: "default",
      },
    ],
  },
  {
    id: "salesScreen",
    title: "Sales Screen",
    description: "Order entry behaviour and cashier controls.",
    requiredModule: "liveOrders",
    fields: [
      {
        key: "ordersEnabled",
        label: "Order-based Sales",
        description:
          "Enable the order basket. Disable to use single-tap sales (simpler, no close-order pop-up).",
        type: "boolean",
        scope: "client",
        versioned: false,
        defaultValue: true,
      },
      {
        key: "addItemPopupEnabled",
        label: "Add-Item Pop-up",
        description: "Show deposit breakdown pop-up when adding an outside item.",
        type: "boolean",
        scope: "client",
        versioned: false,
        defaultValue: true,
      },
      {
        key: "closeOrderPopupEnabled",
        label: "Close-Order Pop-up",
        description: "Show the full close-order review pop-up before saving.",
        type: "boolean",
        scope: "client",
        versioned: false,
        defaultValue: true,
      },
      {
        key: "undoWindowSeconds",
        label: "Undo Window (seconds)",
        description: "How long after saving a sale the cashier can undo it.",
        type: "integer",
        scope: "client",
        versioned: false,
        defaultValue: 60,
        min: 0,
        max: 300,
      },
    ],
  },
  {
    id: "credit",
    title: "Credit (Tabs)",
    description: "Default credit limit and due-day settings for tab customers.",
    requiredModule: "tabs",
    fields: [
      {
        key: "defaultCreditLimitCents",
        label: "Default Credit Limit (LKR)",
        description: "Default credit limit for new tab customers (stored as cents).",
        type: "integer",
        scope: "client",
        versioned: true,
        defaultValue: 500000, // Rs. 5,000.00
        min: 0,
        warnThresholdPercent: 50,
      },
      {
        key: "defaultDueDays",
        label: "Default Due Days",
        description:
          "Number of days after the oldest unpaid tab sale before it is overdue. Changing this applies to all customers on the default.",
        type: "integer",
        scope: "client",
        versioned: true,
        defaultValue: 30,
        min: 1,
        max: 365,
      },
      {
        key: "overLimitBehaviour",
        label: "Over-Limit Behaviour",
        description:
          "What happens when a tab sale would exceed the customer credit limit.",
        type: "select",
        scope: "client",
        versioned: false,
        options: [
          { value: "request", label: "Create an admin approval request" },
          { value: "block", label: "Block the sale immediately" },
        ],
        defaultValue: "request",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    description: "Enable or disable payment methods.",
    fields: [
      {
        key: "cashEnabled",
        label: "Cash Payments",
        description: "Allow cash as a payment method.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: true,
      },
      {
        key: "debitCardEnabled",
        label: "Debit Card Payments",
        description: "Allow debit card as a payment method.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: true,
      },
      {
        key: "creditCardEnabled",
        label: "Credit Card Payments",
        description: "Allow credit card as a payment method.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: false,
      },
      {
        key: "tabEnabled",
        label: "Tab (Credit) Payments",
        description: "Allow tab (pay later) as a payment method.",
        type: "boolean",
        scope: "client",
        versioned: true,
        defaultValue: true,
      },
    ],
  },
  {
    id: "dayClose",
    title: "Day Close",
    description: "Reconciliation tolerance and anomaly detection sensitivity.",
    requiredModule: "dayClose",
    fields: [
      {
        key: "toleranceBottles",
        label: "Stock Tolerance (bottles)",
        description: "Variance within this many bottles closes automatically.",
        type: "integer",
        scope: "client",
        versioned: true,
        defaultValue: 1,
        min: 0,
        max: 10,
      },
      {
        key: "toleranceCashCents",
        label: "Cash Tolerance (LKR)",
        description: "Variance within this amount closes automatically (stored as cents).",
        type: "integer",
        scope: "client",
        versioned: true,
        defaultValue: 50000, // Rs. 500.00
        min: 0,
        warnThresholdPercent: 100,
      },
      {
        key: "anomalyStdDevMultiplier",
        label: "Anomaly Sensitivity (σ)",
        description:
          "A day is flagged when |variance| > this multiple of the rolling 30-day std deviation.",
        type: "integer",
        scope: "client",
        versioned: false,
        defaultValue: 2,
        min: 1,
        max: 5,
      },
    ],
  },
  {
    id: "approvals",
    title: "Approvals",
    description: "Which actions require admin approval and whether cashiers can request.",
    requiredModule: "adminRequests",
    fields: [
      {
        key: "cashiersCanSendRequests",
        label: "Cashiers Can Send Requests",
        description: "Allow cashiers to send approval requests to the admin.",
        type: "boolean",
        scope: "client",
        versioned: false,
        defaultValue: true,
      },
    ],
  },
  {
    id: "stock",
    title: "Stock",
    description: "Global reorder and low-stock defaults (overridable per product).",
    requiredModule: "stock",
    fields: [
      {
        key: "defaultLeadDays",
        label: "Default Supplier Lead Days",
        description: "Days between placing an order and receiving stock.",
        type: "integer",
        scope: "client",
        versioned: false,
        defaultValue: 3,
        min: 1,
        max: 90,
      },
      {
        key: "defaultLowStockLevel",
        label: "Default Low-Stock Level (units)",
        description: "Show the low-stock pill when stock falls to or below this level.",
        type: "integer",
        scope: "client",
        versioned: false,
        defaultValue: 12,
        min: 0,
      },
    ],
  },
  // Additional tabs (prices, happyHour, monthEnd, expenses, productsCategories,
  // dashboardLayout, users, data) are registered here in later phases.
  // Each tab's fields will be rendered automatically by the SettingsPage shell.
] as const;

export function getSettingsTab(id: SettingsTabId): SettingsTabDefinition {
  const tab = SETTINGS_TAB_REGISTRY.find((t) => t.id === id);
  if (!tab) throw new Error(`Settings tab "${id}" not found in registry`);
  return tab;
}

/** All setting keys as a union type for type-safe lookups. */
export type SettingKey = (typeof SETTINGS_TAB_REGISTRY)[number]["fields"][number]["key"];
