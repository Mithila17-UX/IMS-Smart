import React, { useState } from "react";
import type { Product } from "@/data/schemas/product.schema";
import type { StockMovementType } from "@/data/schemas/stockMovement.schema";
import { stockRepository } from "@/data/repositories/stockRepository";
import { X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  products: Product[];
  userId: string;
  isAdmin: boolean;
  onSaved?: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  products,
  userId,
  isAdmin,
  onSaved,
}) => {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [type, setType] = useState<StockMovementType>("wastage");
  const [qty, setQty] = useState(1);
  const [isReduction, setIsReduction] = useState(true);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    if (qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!reason.trim()) {
      setError("A clear reason is required for any stock adjustment or breakage.");
      return;
    }

    if ((type === "staff_drink" || type === "complimentary") && !isAdmin) {
      setError("Staff drinks and complimentary items must be recorded or approved by an administrator.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Wastage, staff_drink, and complimentary always reduce stock (-qty)
      // Adjustment can reduce or increase
      const finalQty =
        type === "adjustment"
          ? isReduction
            ? -Math.abs(qty)
            : Math.abs(qty)
          : -Math.abs(qty);

      await stockRepository.recordStockAdjustment(clientId, {
        productId,
        type,
        qty: finalQty,
        reason: reason.trim(),
        cashierId: userId,
        approvedBy: isAdmin ? userId : undefined,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record stock adjustment.");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Log Stock Wastage / Adjustment</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Product *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} — {p.name} (Stock: {p.stockOnHand})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Movement Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StockMovementType)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="wastage">Wastage / Breakage / Spoilage</option>
              <option value="adjustment">Stock Count Adjustment (Correction)</option>
              {isAdmin && (
                <>
                  <option value="staff_drink">Staff Drink (Admin Approved)</option>
                  <option value="complimentary">Complimentary / Free Pour (Admin Approved)</option>
                </>
              )}
            </select>
          </div>

          {type === "adjustment" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsReduction(true)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                  isReduction
                    ? "border-rose-500 bg-rose-500/10 text-rose-300"
                    : "border-slate-800 bg-slate-800 text-slate-400"
                }`}
              >
                Decrease Stock (−)
              </button>
              <button
                type="button"
                onClick={() => setIsReduction(false)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                  !isReduction
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-800 bg-slate-800 text-slate-400"
                }`}
              >
                Increase Stock (+)
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Quantity (Units) *
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
            {selectedProduct && (
              <p className="mt-1 text-[11px] text-slate-400">
                Current stock on hand: {selectedProduct.stockOnHand} units
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Reason / Explanation *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Dropped bottle behind counter during dinner rush"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Recorded in the immutable stock ledger with your user ID.
            </p>
          </div>

          {(type === "staff_drink" || type === "complimentary") && isAdmin && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-xs text-indigo-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-400" />
              <span>Will be logged as approved by Administrator ({userId})</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-amber-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Movement Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
