import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { offersRepository } from "@/data/repositories/offersRepository";
import type { Offer } from "@/data/schemas/offer.schema";
import { isOfferActive } from "@/domain/offers";
import { formatMoney } from "@/lib/money";
import { OfferModal } from "./OfferModal";
import { Tag, Plus, Clock, Edit2, CheckCircle2 } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const OffersPage: React.FC = () => {
  const { effectiveClientId, role } = useAuth();
  const isAdmin = role === "client_admin" || role === "superadmin";

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  useEffect(() => {
    if (!effectiveClientId) return;
    setLoading(true);

    const unsub = offersRepository.subscribeAllOffers(
      effectiveClientId,
      (o) => {
        setOffers(o);
        setLoading(false);
      },
      (err) => {
        console.error("Offers error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [effectiveClientId]);

  const nowIso = new Date().toISOString();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Tag className="h-7 w-7 text-emerald-400" />
            Promotional Offers & Happy Hour
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule automatic price discounts, happy hour specials, and rule-based promotions.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingOffer(null);
              setOfferModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            Create Offer
          </button>
        )}
      </div>

      {/* Offers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500">
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500">
            No promotional offers created yet.
          </div>
        ) : (
          offers.map((offer) => {
            const isCurrentlyLive = isOfferActive(offer, nowIso);

            return (
              <div
                key={offer.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{offer.name}</span>
                    <div className="flex items-center gap-1.5">
                      {isCurrentlyLive && (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Live Now
                        </span>
                      )}
                      {!offer.active && (
                        <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rule details */}
                  <div className="mt-3 rounded-lg bg-slate-800/50 p-2.5 text-xs text-slate-300">
                    <div className="font-medium text-white">
                      {offer.ruleType === "fixed_price" && `Fixed Price: ${formatMoney(offer.value)}`}
                      {offer.ruleType === "amount_off" && `Discount: ${formatMoney(offer.value)} off`}
                      {offer.ruleType === "percent_off" && `Discount: ${offer.value}% off base price`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Priority: {offer.priority} · Channels: {offer.channels.join(", ") || "All"}
                    </div>
                  </div>

                  {/* Days and Time */}
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        {offer.startTime} – {offer.endTime}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Days: {offer.days.map((d) => DAY_NAMES[d]).join(", ")}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOffer(offer);
                        setOfferModalOpen(true);
                      }}
                      className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {effectiveClientId && (
        <OfferModal
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          clientId={effectiveClientId}
          offerToEdit={editingOffer}
        />
      )}
    </div>
  );
};
