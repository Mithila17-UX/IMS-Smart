import React, { useState, useEffect } from "react";
import type { ExpenseCategory } from "@/data/schemas/cashEntry.schema";
import { cashRepository } from "@/data/repositories/cashRepository";
import { X, Loader2, Tag } from "lucide-react";

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  categoryToEdit?: ExpenseCategory | null;
  onSaved?: () => void;
}

export const ExpenseCategoryModal: React.FC<ExpenseCategoryModalProps> = ({
  isOpen,
  onClose,
  clientId,
  categoryToEdit,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [affectsProfit, setAffectsProfit] = useState(true);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setAffectsProfit(categoryToEdit.affectsProfit);
      setActive(categoryToEdit.active);
    } else {
      setName("");
      setAffectsProfit(true);
      setActive(true);
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await cashRepository.saveExpenseCategory(
        clientId,
        {
          name: name.trim(),
          affectsProfit,
          active,
        },
        categoryToEdit?.id,
      );
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save category:", err);
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {categoryToEdit ? "Edit Category" : "New Expense Category"}
              </h2>
              <p className="text-xs text-slate-400">Classification for cash drawer expenses</p>
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Category Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bar Consumables (Lemons/Mint/Ice), Cleaning, Gas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={affectsProfit}
                onChange={(e) => setAffectsProfit(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="block text-sm font-medium text-white">
                  Affects Operating Profit
                </span>
                <span className="block text-xs text-slate-400">
                  When checked, expenses logged here are subtracted from daily net profit (e.g. bar ingredients, operational supplies). Uncheck for non-operational cash transfers or owner drawings.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-800/60">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-white">
                Active (available for cashier selection)
              </span>
            </label>
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
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {categoryToEdit ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
