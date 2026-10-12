import React, { useState, useEffect } from "react";
import type { Customer } from "@/data/schemas/customer.schema";
import { customersRepository } from "@/data/repositories/customersRepository";
import { parseToCents, centsToDecimalString } from "@/lib/money";
import { X, Loader2 } from "lucide-react";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  customerToEdit?: Customer | null;
  onSaved?: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  clientId,
  customerToEdit,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimitInput, setCreditLimitInput] = useState("5000.00");
  const [dueDaysOverride, setDueDaysOverride] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setCreditLimitInput(centsToDecimalString(customerToEdit.creditLimit));
      setDueDaysOverride(
        customerToEdit.dueDaysOverride ? String(customerToEdit.dueDaysOverride) : "",
      );
      setNotes(customerToEdit.notes || "");
      setActive(customerToEdit.active);
    } else {
      setName("");
      setPhone("");
      setCreditLimitInput("5000.00");
      setDueDaysOverride("");
      setNotes("");
      setActive(true);
    }
    setError(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone number are required.");
      return;
    }

    const limitCents = parseToCents(creditLimitInput);
    if (limitCents < 0) {
      setError("Credit limit cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await customersRepository.saveCustomer(
        clientId,
        {
          name: name.trim(),
          phone: phone.trim(),
          creditLimit: limitCents,
          dueDaysOverride: dueDaysOverride ? Number(dueDaysOverride) : null,
          balance: customerToEdit ? customerToEdit.balance : 0,
          oldestUnpaidDate: customerToEdit?.oldestUnpaidDate,
          active,
          notes: notes.trim() || undefined,
        },
        customerToEdit?.id,
      );

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">
            {customerToEdit ? "Edit Tab Customer" : "Add Tab Customer"}
          </h2>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ruwan Silva"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 077 1234567"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Credit Limit (LKR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={creditLimitInput}
              onChange={(e) => setCreditLimitInput(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Custom Due Days (Optional Override)
            </label>
            <input
              type="number"
              min="1"
              value={dueDaysOverride}
              onChange={(e) => setDueDaysOverride(e.target.value)}
              placeholder="Leave blank to use default (e.g. 30 days)"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Leave blank to follow the client&apos;s global default due period.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VIP patron, regular, etc."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="custActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="custActive" className="text-xs font-medium text-slate-300">
              Active Customer Account
            </label>
          </div>

          <div className="mt-5 flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-800 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {customerToEdit ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
