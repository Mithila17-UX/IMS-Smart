import React, { useState } from "react";
import type { Product, PriceVersion } from "@/data/schemas/product.schema";
import { productsRepository } from "@/data/repositories/productsRepository";
import { formatMoney, parseToCents, centsToDecimalString } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { X, Loader2, AlertTriangle, History } from "lucide-react";

interface PriceVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  product: Product;
  priceVersions: PriceVersion[];
  channels: string[];
  userId: string;
  onSaved?: () => void;
}

export const PriceVersionModal: React.FC<PriceVersionModalProps> = ({
  isOpen,
  onClose,
  clientId,
  product,
  priceVersions,
  channels,
  userId,
  onSaved,
}) => {
  const [selectedChannel, setSelectedChannel] = useState("inside");
  const [beerPriceInput, setBeerPriceInput] = useState("");
  const [addOnInput, setAddOnInput] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [changeReason, setChangeReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter versions for this specific product
  const productVersions = priceVersions
    .filter((v) => v.productId === product.id)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  // Current active version for selected channel
  const currentForChannel = productVersions.find(
    (v) => v.channel === selectedChannel && new Date(v.effectiveFrom).getTime() <= Date.now(),
  );

  const handlePriceChange = (val: string) => {
    setBeerPriceInput(val);
    const newCents = parseToCents(val);
    if (currentForChannel && currentForChannel.beerPrice > 0 && newCents > 0) {
      const pct = Math.abs((newCents - currentForChannel.beerPrice) / currentForChannel.beerPrice) * 100;
      if (pct >= 30) {
        setWarning(`Price change is ${pct.toFixed(0)}% from current (${formatMoney(currentForChannel.beerPrice)}). Please verify.`);
      } else {
        setWarning(null);
      }
    } else {
      setWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const beerPriceCents = parseToCents(beerPriceInput);
    const addOnCents = selectedChannel === "outside" ? parseToCents(addOnInput) : 0;

    if (beerPriceCents <= 0) {
      setError("Please enter a valid base price.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await productsRepository.addPriceVersion(clientId, {
        productId: product.id,
        channel: selectedChannel,
        beerPrice: beerPriceCents,
        addOn: addOnCents,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        changedBy: userId,
        changeReason: changeReason.trim() || undefined,
      });

      setBeerPriceInput("");
      setAddOnInput("");
      setChangeReason("");
      setWarning(null);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save price version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Price Management & History</h2>
            <p className="text-xs text-slate-400">
              {product.brand} — {product.name}
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
          {/* Form to Set New Price Version */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Update Price Version
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Sales Channel</label>
              <div className="flex gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch);
                      const cur = productVersions.find(
                        (v) => v.channel === ch && new Date(v.effectiveFrom).getTime() <= Date.now(),
                      );
                      if (cur) {
                        setBeerPriceInput(centsToDecimalString(cur.beerPrice));
                        setAddOnInput(centsToDecimalString(cur.addOn));
                      }
                    }}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition ${
                      selectedChannel === ch
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {currentForChannel && (
              <div className="rounded-lg bg-slate-800/40 border border-slate-800 p-2.5 text-xs text-slate-300">
                <span className="text-slate-400">Current {selectedChannel} price:</span>{" "}
                <span className="font-semibold text-white">
                  {formatMoney(currentForChannel.beerPrice)}
                </span>
                {currentForChannel.addOn > 0 && (
                  <span className="text-slate-400">
                    {" "}
                    + {formatMoney(currentForChannel.addOn)} add-on
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Base Beer Price (LKR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={beerPriceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="e.g. 900.00"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {selectedChannel === "outside" && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Outside Bar Add-On Markup (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addOnInput}
                  onChange={(e) => setAddOnInput(e.target.value)}
                  placeholder="e.g. 100.00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Total takeaway price = beer price + add-on + bottle deposit.
                </p>
              </div>
            )}

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
                Changes apply only from this moment forward and never rewrite past records.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason for Change
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Supplier excise duty increase"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {warning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save New Price Version
            </button>
          </form>

          {/* Version History Table */}
          <div className="border-l border-slate-800 pl-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Price Version History
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
              {productVersions.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No price versions recorded yet for this product.
                </div>
              ) : (
                productVersions.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white capitalize">
                        {v.channel} Channel
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatMoney(v.beerPrice)}
                        {v.addOn > 0 && ` + ${formatMoney(v.addOn)} add-on`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Effective: {formatDateTime(v.effectiveFrom)}</span>
                      {new Date(v.effectiveFrom).getTime() <= Date.now() ? (
                        <span className="text-emerald-400 text-[10px]">Active</span>
                      ) : (
                        <span className="text-amber-400 text-[10px]">Scheduled</span>
                      )}
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
