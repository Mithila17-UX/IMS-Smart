import React, { useState, useEffect } from "react";
import type { Supplier } from "@/data/schemas/supplier.schema";
import { suppliersRepository } from "@/data/repositories/suppliersRepository";
import { X, Loader2, Phone, Mail, Building2, Edit2 } from "lucide-react";

interface SuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  suppliers: Supplier[];
  onSaved?: () => void;
}

export const SuppliersModal: React.FC<SuppliersModalProps> = ({
  isOpen,
  onClose,
  clientId,
  suppliers,
  onSaved,
}) => {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSupplier) {
      setName(editingSupplier.name);
      setContactName(editingSupplier.contactName || "");
      setContactPhone(editingSupplier.contactPhone || "");
      setContactEmail(editingSupplier.contactEmail || "");
      setNotes(editingSupplier.notes || "");
      setActive(editingSupplier.active);
    } else {
      setName("");
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setNotes("");
      setActive(true);
    }
    setError(null);
  }, [editingSupplier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await suppliersRepository.saveSupplier(
        clientId,
        {
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
          active,
        },
        editingSupplier?.id,
      );

      setEditingSupplier(null);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save supplier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Suppliers Management</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Suppliers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Suppliers ({suppliers.length})
              </h3>
              {editingSupplier && (
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  + Add new supplier
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {suppliers.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No suppliers registered yet.
                </div>
              ) : (
                suppliers.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setEditingSupplier(s)}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      editingSupplier?.id === s.id
                        ? "border-emerald-500 bg-emerald-500/10 text-white"
                        : "border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{s.name}</span>
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    {s.contactName && (
                      <div className="text-xs text-slate-400 mt-1">
                        Contact: {s.contactName}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                      {s.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          {s.contactPhone}
                        </span>
                      )}
                      {s.contactEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-500" />
                          {s.contactEmail}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-l border-slate-800 pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {editingSupplier ? `Edit: ${editingSupplier.name}` : "Add Supplier"}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company / Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ceylon Beverage Holdings Ltd"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Ruwan Silva"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 011 2345678"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="orders@supplier.lk"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery schedule, lead days, terms..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="supplierActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="supplierActive" className="text-xs font-medium text-slate-300">
                Active Supplier
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingSupplier ? "Save Changes" : "Add Supplier"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
