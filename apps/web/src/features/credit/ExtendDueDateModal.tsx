import React, { useState } from "react";
import type { Customer } from "@/data/schemas/customer.schema";
import { customersRepository } from "@/data/repositories/customersRepository";
import { X, Loader2, Calendar, CheckCircle2 } from "lucide-react";

interface ExtendDueDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  customer: Customer;
  currentDueDate: string | null;
  adminId: string;
  onSaved?: () => void;
}

export const ExtendDueDateModal: React.FC<ExtendDueDateModalProps> = ({
  isOpen,
  onClose,
  clientId,
  customer,
  currentDueDate,
  adminId,
  onSaved,
}) => {
  const [newDueDate, setNewDueDate] = useState(() => currentDueDate || "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueDate) {
      setError("Please select a new due date.");
      return;
    }
    if (!reason.trim()) {
      setError("A clear reason is required for extending customer due dates.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await customersRepository.extendDueDate(clientId, {
        customerId: customer.id,
        newDueDate,
        reason: reason.trim(),
        changedBy: adminId,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to extend due date.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Extend Customer Due Date</h2>
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

        <div className="mt-3 rounded-lg bg-slate-800/60 border border-slate-700/60 p-3 text-xs">
          <span className="text-slate-400">Customer:</span>{" "}
          <strong className="text-white">{customer.name}</strong>
          {currentDueDate && (
            <div className="mt-1 text-slate-400">
              Current Due Date: <strong className="text-amber-400 font-mono">{currentDueDate}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              New Extended Due Date *
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Reason / Explanation (Mandatory) *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patron requested extra 14 days; salary delayed"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Saved in immutable extension history with your admin credentials.
            </p>
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
              Save Extension
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
