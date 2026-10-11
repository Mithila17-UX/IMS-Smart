import React, { useState } from "react";
import type { Product } from "@/data/schemas/product.schema";
import type { Supplier } from "@/data/schemas/supplier.schema";
import { stockRepository } from "@/data/repositories/stockRepository";
import { formatMoney, parseToCents } from "@/lib/money";
import { X, Loader2, Plus, Trash2, Truck } from "lucide-react";

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  products: Product[];
  suppliers: Supplier[];
  userId: string;
  onSaved?: () => void;
}

interface LineItemForm {
  productId: string;
  qty: number;
  unitCostInput: string;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({
  isOpen,
  onClose,
  clientId,
  products,
  suppliers,
  userId,
  onSaved,
}) => {
  const [supplierId, setSupplierId] = useState("");
  const [deliveredOn, setDeliveredOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<LineItemForm[]>([
    {
      productId: products[0]?.id || "",
      qty: 24,
      unitCostInput: "",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        productId: products[0]?.id || "",
        qty: 24,
        unitCostInput: "",
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      setError("Delivery must contain at least one product line.");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof LineItemForm, value: unknown) => {
    const updated = [...lines];
    const current = updated[index];
    if (!current) return;
    updated[index] = { ...current, [field]: value } as LineItemForm;
    setLines(updated);
  };

  // Grand totals
  const totalUnits = lines.reduce((acc, l) => acc + (Number(l.qty) || 0), 0);
  const totalSpendCents = lines.reduce(
    (acc, l) => acc + (Number(l.qty) || 0) * parseToCents(l.unitCostInput),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }

    if (lines.length === 0) {
      setError("Please add at least one product line.");
      return;
    }

    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      if (!l.productId) {
        setError(`Line #${i + 1}: Please select a product.`);
        return;
      }
      if (l.qty <= 0) {
        setError(`Line #${i + 1}: Quantity must be greater than zero.`);
        return;
      }
      if (parseToCents(l.unitCostInput) <= 0) {
        setError(`Line #${i + 1}: Unit cost must be greater than zero.`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      await stockRepository.recordPurchase(clientId, {
        supplierId,
        deliveredOn,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          qty: Number(l.qty),
          unitCost: parseToCents(l.unitCostInput),
        })),
        recordedBy: userId,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record purchase delivery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Record Supplier Delivery (Stock In)</h2>
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
          {/* Top metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Delivered On Date *
              </label>
              <input
                type="date"
                value={deliveredOn}
                onChange={(e) => setDeliveredOn(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Invoice / Reference #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. CBH-INV-9921"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Line items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Products Received ({lines.length} items)
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 rounded bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-emerald-400 hover:bg-slate-700"
              >
                <Plus className="h-3 w-3" />
                Add Product Line
              </button>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
              {lines.map((line, idx) => {
                const lineTotalCents = (Number(line.qty) || 0) * parseToCents(line.unitCostInput);
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-2 rounded bg-slate-800/60 p-2 text-xs"
                  >
                    <div className="flex-1 w-full">
                      <select
                        value={line.productId}
                        onChange={(e) => handleLineChange(idx, "productId", e.target.value)}
                        required
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.brand} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={line.qty}
                        onChange={(e) => handleLineChange(idx, "qty", Number(e.target.value))}
                        placeholder="Qty"
                        required
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white text-right font-mono focus:outline-none"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unitCostInput}
                        onChange={(e) => handleLineChange(idx, "unitCostInput", e.target.value)}
                        placeholder="Unit Cost LKR"
                        required
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white text-right font-mono focus:outline-none"
                      />
                    </div>

                    <div className="w-28 text-right font-mono font-semibold text-emerald-400">
                      {formatMoney(lineTotalCents)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received by cellar team; intact seal"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Delivery Summary Banner */}
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
            <div>
              <span className="text-slate-400">Total Units to Receive:</span>{" "}
              <strong className="text-white font-mono text-sm">{totalUnits} units</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Delivery Cost:</span>{" "}
              <strong className="text-emerald-400 font-mono text-base font-bold">
                {formatMoney(totalSpendCents)}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            * This delivery will append to the stock movement ledger, add to stock on hand, and automatically update each product&apos;s Weighted Average Cost (WAC).
          </p>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-800">
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
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Post Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
