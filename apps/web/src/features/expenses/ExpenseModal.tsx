import React, { useState, useEffect } from "react";
import type { ExpenseCategory } from "@/data/schemas/cashEntry.schema";
import { cashRepository } from "@/data/repositories/cashRepository";
import { parseToCents } from "@/lib/money";
import { X, Loader2, DollarSign, PlusCircle } from "lucide-react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  categories: ExpenseCategory[];
  recordedBy: string;
  onSaved?: () => void;
  onOpenCategoryModal?: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  clientId,
  categories,
  recordedBy,
  onSaved,
  onOpenCategoryModal,
}) => {
  const [categoryId, setCategoryId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.active);

  useEffect(() => {
    if (isOpen) {
      setAmountInput("");
      setReason("");
      setError(null);
      if (activeCategories.length > 0 && !categoryId) {
        setCategoryId(activeCategories[0]?.id || "");
      }
    }
  }, [isOpen, activeCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseToCents(amountInput);
    if (cents <= 0) {
      setError("Please enter a valid expense amount greater than 0.");
      return;
    }
    if (!categoryId) {
      setError("Please select an expense category.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a brief reason or item description.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await cashRepository.recordExpense(clientId, {
        amount: cents,
        categoryId,
        reason: reason.trim(),
        recordedBy,
      });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to record expense:", err);
      setError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Bar Expense</h2>
              <p className="text-xs text-slate-400">Paid directly out of the cash drawer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Expense Category <span className="text-rose-400">*</span>
              </label>
              {onOpenCategoryModal && (
                <button
                  type="button"
                  onClick={onOpenCategoryModal}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Category
                </button>
              )}
            </div>
            {activeCategories.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                No active expense categories found. Please create one first (e.g. Bar Consumables, Ice, Lemons).
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.affectsProfit ? "(Affects Profit)" : "(Non-Operating / Draw)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Amount (LKR) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
                Rs.
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-12 pr-3.5 py-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reason / Item Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 5kg lemons from market, 2 bags of ice"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || activeCategories.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-rose-500 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Deduct & Record Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
