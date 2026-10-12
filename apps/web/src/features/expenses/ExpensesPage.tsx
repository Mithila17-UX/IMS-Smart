import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { cashRepository } from "@/data/repositories/cashRepository";
import type {
  CashEntry,
  ExpenseCategory,
  CashEntryType,
} from "@/data/schemas/cashEntry.schema";
import { formatMoney } from "@/lib/money";
import { formatDateTime, getBusinessDate } from "@/lib/dates";
import { ExpenseModal } from "./ExpenseModal";
import { ExpenseCategoryModal } from "./ExpenseCategoryModal";
import { FloatMovementModal } from "./FloatMovementModal";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Tag,
  Search,
  Edit2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Receipt,
  RotateCcw,
} from "lucide-react";

export const ExpensesPage: React.FC = () => {
  const { effectiveClientId, user } = useAuth();

  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'ledger' | 'categories'
  const [activeTab, setActiveTab] = useState<"ledger" | "categories">("ledger");

  // Filters for ledger
  const [typeFilter, setTypeFilter] = useState<"all" | CashEntryType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [floatModalOpen, setFloatModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ExpenseCategory | null>(null);

  useEffect(() => {
    if (!effectiveClientId) return;
    setLoading(true);

    const unsubEntries = cashRepository.subscribeCashEntries(
      effectiveClientId,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (err) => console.error("Cash entries error:", err),
      200,
    );

    const unsubCats = cashRepository.subscribeExpenseCategories(
      effectiveClientId,
      (data) => {
        setCategories(data);
      },
      (err) => console.error("Expense categories error:", err),
    );

    return () => {
      unsubEntries();
      unsubCats();
    };
  }, [effectiveClientId]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  // Today's business date
  const todayBusinessDate = getBusinessDate(new Date());

  // Metrics for today
  const todayMetrics = useMemo(() => {
    let todayExpenses = 0;
    let todayInflows = 0;
    let todayOutflows = 0;

    for (const entry of entries) {
      // compare ISO date prefix
      if (entry.at.slice(0, 10) === todayBusinessDate) {
        if (entry.type === "expense") {
          todayExpenses += Math.abs(entry.amount);
        }
        if (entry.amount > 0) {
          todayInflows += entry.amount;
        } else {
          todayOutflows += Math.abs(entry.amount);
        }
      }
    }

    const netFlow = todayInflows - todayOutflows;
    return { todayExpenses, todayInflows, todayOutflows, netFlow };
  }, [entries, todayBusinessDate]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const reasonMatch = e.reason?.toLowerCase().includes(q) ?? false;
        const userMatch = e.recordedBy?.toLowerCase().includes(q) ?? false;
        const catName = e.categoryId ? categoryMap.get(e.categoryId)?.name?.toLowerCase() : "";
        const catMatch = catName?.includes(q) ?? false;
        if (!reasonMatch && !userMatch && !catMatch) return false;
      }
      return true;
    });
  }, [entries, typeFilter, searchQuery, categoryMap]);

  const getTypeBadge = (type: CashEntryType) => {
    switch (type) {
      case "expense":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <TrendingDown className="h-3 w-3" />
            Expense
          </span>
        );
      case "float_in":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="h-3 w-3" />
            Float In
          </span>
        );
      case "float_out":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
            <ArrowUpRight className="h-3 w-3" />
            Float Drop
          </span>
        );
      case "sale":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Receipt className="h-3 w-3" />
            Cash Sale
          </span>
        );
      case "tab_payment":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/20">
            <Wallet className="h-3 w-3" />
            Tab Repaid
          </span>
        );
      case "deposit_refund":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <RotateCcw className="h-3 w-3" />
            Deposit Refund
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Expenses & Cash Ledger
          </h1>
          <p className="text-sm text-slate-400">
            Real-time cash drawer inflows, operational bar expenses, and categories
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setCategoryToEdit(null);
              setCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Tag className="h-4 w-4" />
            Categories
          </button>
          <button
            type="button"
            onClick={() => setFloatModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            Float In / Drop
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-rose-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Bar Expenses</span>
            <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {formatMoney(todayMetrics.todayExpenses)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Deducted out of cash drawer today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Cash Inflows</span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            +{formatMoney(todayMetrics.todayInflows)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cash sales, tab repayments & float in
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Cash Outflows</span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            -{formatMoney(todayMetrics.todayOutflows)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Expenses, bottle refunds & safe drops
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Net Drawer Flow</span>
            <div className="rounded-lg bg-sky-500/10 p-1.5 text-sky-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              todayMetrics.netFlow >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {todayMetrics.netFlow >= 0 ? "+" : ""}
            {formatMoney(todayMetrics.netFlow)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Net change in cash drawer today
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-slate-800">
        <div className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "ledger"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            Cash Drawer Ledger ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "categories"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            Expense Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* TAB 1: LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "expense", label: "Expenses" },
                  { id: "float_in", label: "Float In" },
                  { id: "float_out", label: "Float Drop" },
                  { id: "sale", label: "Sales" },
                  { id: "tab_payment", label: "Tab Repaid" },
                  { id: "deposit_refund", label: "Deposit Refunds" },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setTypeFilter(pill.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    typeFilter === pill.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search reason, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-400">
                Loading cash entries...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-medium text-slate-300">
                  No cash drawer entries found
                </p>
                <p className="text-xs text-slate-500">
                  Record an expense or float movement to start tracking drawer transactions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-800/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Details / Category</th>
                      <th className="px-5 py-3">Recorded By</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEntries.map((entry) => {
                      const cat = entry.categoryId ? categoryMap.get(entry.categoryId) : undefined;
                      const isPositive = entry.amount > 0;

                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap font-mono">
                            {formatDateTime(entry.at)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {getTypeBadge(entry.type)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-white text-sm">
                                {entry.reason ||
                                  (entry.type === "sale" && `Order #${entry.orderId?.slice(0, 8) || "N/A"}`) ||
                                  (entry.type === "tab_payment" && "Customer tab repayment") ||
                                  (entry.type === "deposit_refund" && "Bottle deposit cash refund") ||
                                  "-"}
                              </span>
                              {cat && (
                                <span className="text-xs text-slate-400 mt-0.5">
                                  Category: {cat.name}{" "}
                                  {!cat.affectsProfit && (
                                    <span className="text-amber-400 font-mono text-[10px]">
                                      (Non-Operating)
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {entry.recordedBy}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono font-semibold">
                            <span
                              className={
                                isPositive ? "text-emerald-400" : "text-rose-400"
                              }
                            >
                              {isPositive ? "+" : "-"}
                              {formatMoney(Math.abs(entry.amount))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Custom categories to categorize bar consumables, ice, lemons, gas, and operational costs.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryToEdit(null);
                setCategoryModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-purple-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
                No expense categories created yet. Click "Add Category" above to configure your bar's operational categories.
              </div>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {c.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryToEdit(c);
                          setCategoryModalOpen(true);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          c.affectsProfit
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-slate-700/50 text-slate-300 border border-slate-600/50"
                        }`}
                      >
                        {c.affectsProfit ? "Deducts from Net Profit" : "Non-Operating / Draw"}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          c.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-800"
                        }`}
                      >
                        {c.active ? "Active" : "Archived"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-500">
                    Created: {c.createdAt ? formatDateTime(c.createdAt) : "Default"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {effectiveClientId && user?.email && (
        <>
          <ExpenseModal
            isOpen={expenseModalOpen}
            onClose={() => setExpenseModalOpen(false)}
            clientId={effectiveClientId}
            categories={categories}
            recordedBy={user.email}
            onOpenCategoryModal={() => {
              setCategoryToEdit(null);
              setCategoryModalOpen(true);
            }}
          />

          <FloatMovementModal
            isOpen={floatModalOpen}
            onClose={() => setFloatModalOpen(false)}
            clientId={effectiveClientId}
            recordedBy={user.email}
          />

          <ExpenseCategoryModal
            isOpen={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            clientId={effectiveClientId}
            categoryToEdit={categoryToEdit}
          />
        </>
      )}
    </div>
  );
};
