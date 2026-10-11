import React, { useState } from "react";
import type { Category, DepositVersion } from "@/data/schemas/product.schema";
import { productsRepository } from "@/data/repositories/productsRepository";
import { formatMoney, parseToCents } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { X, Loader2, History, ShieldCheck } from "lucide-react";

interface DepositVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  category: Category;
  depositVersions: DepositVersion[];
  userId: string;
  onSaved?: () => void;
}

export const DepositVersionModal: React.FC<DepositVersionModalProps> = ({
  isOpen,
  onClose,
  clientId,
  category,
  depositVersions,
  userId,
  onSaved,
}) => {
  const [amountInput, setAmountInput] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [changeReason, setChangeReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categoryVersions = depositVersions
    .filter((v) => v.categoryId === category.id)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  const currentVersion = categoryVersions.find(
    (v) => new Date(v.effectiveFrom).getTime() <= Date.now(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseToCents(amountInput);

    if (amountCents < 0) {
      setError("Deposit amount cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await productsRepository.addDepositVersion(clientId, {
        categoryId: category.id,
        amount: amountCents,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        changedBy: userId,
        changeReason: changeReason.trim() || undefined,
      });

      setAmountInput("");
      setChangeReason("");
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save deposit version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Government Deposit Rate</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Category: {category.name} ({category.unit})
            </p>
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
          {/* New Version Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Set New Deposit Rate
            </h3>

            {currentVersion && (
              <div className="rounded-lg bg-slate-800/40 border border-slate-800 p-3 text-xs">
                <span className="text-slate-400">Current government deposit rate:</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {formatMoney(currentVersion.amount)} / {category.unit}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Deposit Rate (LKR per {category.unit}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="e.g. 200.00"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Effective From *
              </label>
              <input
                type="datetime-local"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Returns always use the government rate in force at the time of the return.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason / Gazette Reference
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Government Gazette No. 2026/02"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save New Deposit Rate
            </button>
          </form>

          {/* History */}
          <div className="border-l border-slate-800 pl-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Deposit Rate History
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2 pr-1">
              {categoryVersions.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No deposit rate versions recorded yet.
                </div>
              ) : (
                categoryVersions.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-emerald-400 font-bold text-sm">
                        {formatMoney(v.amount)}
                      </span>
                      {new Date(v.effectiveFrom).getTime() <= Date.now() ? (
                        <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Effective: {formatDateTime(v.effectiveFrom)}
                    </div>
                    {v.changeReason && (
                      <p className="mt-1 text-[11px] text-slate-400 italic">
                        &quot;{v.changeReason}&quot;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
