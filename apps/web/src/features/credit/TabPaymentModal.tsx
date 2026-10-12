import React, { useState } from "react";
import type { Customer } from "@/data/schemas/customer.schema";
import { customersRepository } from "@/data/repositories/customersRepository";
import { formatMoney, parseToCents } from "@/lib/money";
import { X, Loader2, Banknote, CreditCard, CheckCircle2 } from "lucide-react";

interface TabPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  customer: Customer;
  userId: string;
  onSaved?: () => void;
}

export const TabPaymentModal: React.FC<TabPaymentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  customer,
  userId,
  onSaved,
}) => {
  const [amountInput, setAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseToCents(amountInput);

    if (amountCents <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (amountCents > customer.balance) {
      setError(`Payment (${formatMoney(amountCents)}) exceeds outstanding balance (${formatMoney(customer.balance)}).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await customersRepository.recordTabPayment(clientId, {
        customerId: customer.id,
        amount: amountCents,
        paymentMethod,
        recordedBy: userId,
        notes: notes.trim() || undefined,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Record Tab Repayment</h2>
            <p className="text-xs text-slate-400">
              {customer.name} ({customer.phone})
            </p>
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

        <div className="mt-3 rounded-lg bg-slate-800/60 border border-slate-700/60 p-3 text-xs flex items-center justify-between">
          <span className="text-slate-300">Current Outstanding Tab:</span>
          <span className="font-mono text-base font-bold text-emerald-400">
            {formatMoney(customer.balance)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-400">
                Amount Paid (LKR) *
              </label>
              <button
                type="button"
                onClick={() => setAmountInput((customer.balance / 100).toFixed(2))}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Pay Full Balance
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="e.g. 1800.00"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                  paymentMethod === "cash"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Cash (into drawer)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                  paymentMethod === "card"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Card / Bank Transfer
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Reference / Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settled in full at evening shift"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="mt-5 flex gap-2 pt-3 border-t border-slate-800">
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
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
