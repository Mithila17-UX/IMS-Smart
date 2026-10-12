import React, { useState } from "react";
import type { Product, Category, PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import { getCurrentPrice, getCurrentDeposit } from "@/domain/prices";
import { ordersRepository } from "@/data/repositories/ordersRepository";
import { formatMoney, parseToCents } from "@/lib/money";
import { X, Loader2, Calendar, CheckCircle2 } from "lucide-react";

interface ManualSalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  products: Product[];
  categories: Category[];
  priceVersions: PriceVersion[];
  depositVersions: DepositVersion[];
  depositOnNormalSales: boolean;
  userId: string;
  onSaved?: () => void;
}

interface ProductEntryState {
  productId: string;
  insideQty: number;
  outsideQty: number;
}

export const ManualSalesEntryModal: React.FC<ManualSalesEntryModalProps> = ({
  isOpen,
  onClose,
  clientId,
  products,
  categories,
  priceVersions,
  depositVersions,
  depositOnNormalSales,
  userId,
  onSaved,
}) => {
  const [businessDate, setBusinessDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [entries, setEntries] = useState<Record<string, ProductEntryState>>({});
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const handleQtyChange = (
    productId: string,
    channel: "insideQty" | "outsideQty",
    value: number,
  ) => {
    setEntries((prev) => ({
      ...prev,
      [productId]: {
        productId,
        insideQty: channel === "insideQty" ? value : prev[productId]?.insideQty || 0,
        outsideQty: channel === "outsideQty" ? value : prev[productId]?.outsideQty || 0,
      },
    }));
  };

  // Compute total sales value derived from entered units
  let derivedTotalCents = 0;
  products.forEach((p) => {
    const entry = entries[p.id];
    const cat = categoryMap.get(p.categoryId);
    const insidePrice = getCurrentPrice(p.id, "inside", priceVersions)?.beerPrice || 0;
    const outsidePriceObj = getCurrentPrice(p.id, "outside", priceVersions);
    const deposit = cat?.returnableContainer && depositOnNormalSales
      ? getCurrentDeposit(cat.id, depositVersions)
      : 0;
    const outsidePrice = outsidePriceObj
      ? outsidePriceObj.beerPrice + outsidePriceObj.addOn + deposit
      : 0;

    const insideQty = entry?.insideQty || 0;
    const outsideQty = entry?.outsideQty || 0;

    derivedTotalCents += insideQty * insidePrice + outsideQty * outsidePrice;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const salesList: Array<{
      productId: string;
      channel: string;
      qty: number;
      unitPrice: number;
      depositPortion: number;
      depositWaived: boolean;
    }> = [];

    products.forEach((p) => {
      const entry = entries[p.id];
      const cat = categoryMap.get(p.categoryId);
      const insidePrice = getCurrentPrice(p.id, "inside", priceVersions)?.beerPrice || 0;
      const outsidePriceObj = getCurrentPrice(p.id, "outside", priceVersions);
      const deposit = cat?.returnableContainer && depositOnNormalSales
        ? getCurrentDeposit(cat.id, depositVersions)
        : 0;
      const outsidePrice = outsidePriceObj
        ? outsidePriceObj.beerPrice + outsidePriceObj.addOn + deposit
        : 0;

      if (entry && entry.insideQty > 0) {
        salesList.push({
          productId: p.id,
          channel: "inside",
          qty: entry.insideQty,
          unitPrice: insidePrice,
          depositPortion: 0,
          depositWaived: false,
        });
      }

      if (entry && entry.outsideQty > 0) {
        salesList.push({
          productId: p.id,
          channel: "outside",
          qty: entry.outsideQty,
          unitPrice: outsidePrice,
          depositPortion: deposit,
          depositWaived: false,
        });
      }
    });

    if (salesList.length === 0) {
      setError("Please enter quantity sold for at least one product.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await ordersRepository.recordDailyManualSales(clientId, {
        businessDate,
        cashierId: userId,
        sales: salesList,
        totalCashReceived: parseToCents(cashReceivedInput),
        notes: notes.trim() || undefined,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record manual sales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Daily Manual Sales Entry</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Business Date *</label>
              <input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Cash Counted / Collected (LKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashReceivedInput}
                onChange={(e) => setCashReceivedInput(e.target.value)}
                placeholder="e.g. 58500.00"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Product Quantities Table */}
          <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Stock on Hand</th>
                  <th className="py-2.5 px-3 text-center">Inside Units Sold</th>
                  <th className="py-2.5 px-3 text-center">Outside Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20">
                    <td className="py-2 px-3">
                      <span className="font-semibold text-white block">{p.name}</span>
                      <span className="text-[11px] text-slate-500">{p.brand}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">{p.stockOnHand}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={entries[p.id]?.insideQty || ""}
                        onChange={(e) =>
                          handleQtyChange(p.id, "insideQty", Math.max(0, Number(e.target.value)))
                        }
                        placeholder="0"
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={entries[p.id]?.outsideQty || ""}
                        onChange={(e) =>
                          handleQtyChange(p.id, "outsideQty", Math.max(0, Number(e.target.value)))
                        }
                        placeholder="0"
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Derived Totals Banner */}
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Calculated Sales Value:</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatMoney(derivedTotalCents)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Total Cash Received in Drawer (LKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={formatMoney(derivedTotalCents)}
                value={cashReceivedInput}
                onChange={(e) => setCashReceivedInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="Optional shift notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 pt-2 border-t border-slate-800">
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
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Post Daily Sales
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
