import React, { useState } from "react";
import { cashRepository } from "@/data/repositories/cashRepository";
import { parseToCents } from "@/lib/money";
import { X, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface FloatMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  recordedBy: string;
  onSaved?: () => void;
}

export const FloatMovementModal: React.FC<FloatMovementModalProps> = ({
  isOpen,
  onClose,
  clientId,
  recordedBy,
  onSaved,
}) => {
  const [type, setType] = useState<"float_in" | "float_out">("float_in");
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseToCents(amountInput);
    if (cents <= 0) {
      setError("Please enter a valid cash amount greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason or note for this cash drawer movement.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await cashRepository.recordFloatMovement(clientId, {
        type,
        amount: cents,
        reason: reason.trim(),
        recordedBy,
      });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to record cash movement:", err);
      setError(err instanceof Error ? err.message : "Failed to record cash movement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                type === "float_in"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {type === "float_in" ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Drawer Cash In / Out</h2>
              <p className="text-xs text-slate-400">Opening float or safe cash transfer</p>
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
              Movement Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("float_in")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                  type === "float_in"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500"
                    : "border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Cash IN (Float In)
              </button>
              <button
                type="button"
                onClick={() => setType("float_out")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                  type === "float_out"
                    ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500"
                    : "border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Cash OUT (Drop / Safe)
              </button>
            </div>
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
              Reason / Notes <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder={
                type === "float_in"
                  ? "e.g. Opening drawer float, Petty cash replenishment"
                  : "e.g. Mid-shift safe drop, Cash bank deposit withdrawal"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {/* Quick reason suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(type === "float_in"
                ? ["Opening Float", "Petty Cash Top-up", "Drawer Change Addition"]
                : ["Mid-Shift Safe Drop", "End-Shift Cash Drop", "Bank Deposit Transfer"]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
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
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-colors ${
                type === "float_in"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-amber-600 hover:bg-amber-500"
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {type === "float_in" ? "Record Cash Inflow" : "Record Cash Outflow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
