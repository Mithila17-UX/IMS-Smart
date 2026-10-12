import React, { useState } from "react";
import type { Product, Category, DepositVersion } from "@/data/schemas/product.schema";
import type { Customer } from "@/data/schemas/customer.schema";
import type { StockMovement } from "@/data/schemas/stockMovement.schema";
import type { BottleReturn } from "@/data/schemas/bottleReturn.schema";
import { getCurrentDeposit } from "@/domain/prices";
import { calcBottlesStillOut } from "@/domain/stock";
import { validateBottleReturn, calcReturnRefund } from "@/domain/returns";
import { bottleReturnsRepository } from "@/data/repositories/bottleReturnsRepository";
import { formatMoney } from "@/lib/money";
import { X, Loader2, RotateCcw, ShieldAlert, CheckCircle2 } from "lucide-react";

interface BottleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  products: Product[];
  categories: Category[];
  depositVersions: DepositVersion[];
  customers: Customer[];
  allMovements: StockMovement[];
  allReturns: BottleReturn[];
  userId: string;
  businessDate: string;
  onSaved?: () => void;
}

export const BottleReturnModal: React.FC<BottleReturnModalProps> = ({
  isOpen,
  onClose,
  clientId,
  products,
  categories,
  depositVersions,
  customers,
  allMovements,
  allReturns,
  userId,
  businessDate,
  onSaved,
}) => {
  // Only products in returnable categories are eligible for bottle returns
  const returnableCategoryIds = new Set(
    categories.filter((c) => c.returnableContainer).map((c) => c.id),
  );
  const returnableProducts = products.filter((p) => returnableCategoryIds.has(p.categoryId));

  const [productId, setProductId] = useState<string>(returnableProducts[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [settlement, setSettlement] = useState<"cash" | "discount">("cash");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === productId);
  const productCategory = categories.find((c) => c.id === selectedProduct?.categoryId);

  // Government deposit rate in force today for this category
  const depositRate = productCategory
    ? getCurrentDeposit(productCategory.id, depositVersions)
    : 0;

  // Calculate bottles still out for this product
  const productMovements = allMovements.filter((m) => m.productId === productId);
  const alreadyReturnedCount = allReturns
    .filter((r) => r.productId === productId)
    .reduce((acc, r) => acc + r.qty, 0);

  const bottlesStillOut = calcBottlesStillOut(productMovements, alreadyReturnedCount);
  const totalRefund = calcReturnRefund(qty, depositRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    const validation = validateBottleReturn(qty, bottlesStillOut);
    if (!validation.valid) {
      setError(validation.error || "Invalid bottle return.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await bottleReturnsRepository.recordBottleReturn(clientId, {
        productId,
        qty,
        depositAmount: depositRate,
        totalRefund,
        settlement,
        customerId: customerId || undefined,
        cashierId: userId,
        businessDate,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record bottle return.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Record Customer Bottle Return</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Product Brand *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              {returnableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Info Banner */}
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>Government Deposit Rate:</span>
              <strong className="text-emerald-400 font-mono">{formatMoney(depositRate)} / bottle</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Bottles Still Outstanding (Sold with Deposit):</span>
              <strong className="text-white font-mono">{bottlesStillOut} bottles</strong>
            </div>
            {bottlesStillOut === 0 && (
              <p className="text-[11px] text-amber-400 pt-1 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                No bottles are currently outstanding for this brand. Unsold or outside-bar bottles cannot be accepted.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Quantity Returned *
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(1, bottlesStillOut)}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Settlement Method *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettlement("cash")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                  settlement === "cash"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Cash Refund (from drawer)
              </button>
              <button
                type="button"
                onClick={() => setSettlement("discount")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                  settlement === "discount"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Use as Discount Token
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {settlement === "cash"
                ? "Cash is refunded immediately and deducted from drawer expected cash."
                : "Creates a single-use token that can be deducted when closing an order today."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Customer (Optional)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">-- Anonymous Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Total Refund Banner */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Total Reimbursement:</span>
            <span className="font-mono text-lg font-bold text-emerald-400">
              {formatMoney(totalRefund)}
            </span>
          </div>

          <div className="mt-5 flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || bottlesStillOut === 0}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Accept Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
