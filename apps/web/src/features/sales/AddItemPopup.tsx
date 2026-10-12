import React, { useState, useEffect } from "react";
import type { Product, Category, PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import type { Offer } from "@/data/schemas/offer.schema";
import type { OrderLineItem } from "@/data/schemas/order.schema";
import { resolveSalePrice } from "@/domain/sales";
import { formatMoney } from "@/lib/money";
import { X, Check, ShieldCheck, Tag } from "lucide-react";

interface AddItemPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  category?: Category;
  channel: string;
  priceVersions: PriceVersion[];
  depositVersions: DepositVersion[];
  depositOnNormalSales: boolean;
  depositOnTabSales: boolean;
  offers: Offer[];
  allowChangeMode: boolean; // Settings: allow_change vs confirm_only
  onConfirm: (line: OrderLineItem) => void;
}

export const AddItemPopup: React.FC<AddItemPopupProps> = ({
  isOpen,
  onClose,
  product,
  category,
  channel,
  priceVersions,
  depositVersions,
  depositOnNormalSales,
  depositOnTabSales,
  offers,
  allowChangeMode,
  onConfirm,
}) => {
  const [qty, setQty] = useState(1);
  const [depositWaived, setDepositWaived] = useState(false);

  const isReturnable = category?.returnableContainer ?? false;
  const isOutside = channel === "outside";

  useEffect(() => {
    setQty(1);
    setDepositWaived(false);
  }, [isOpen, product, channel]);

  if (!isOpen) return null;

  const now = new Date().toISOString();
  const breakdown = resolveSalePrice({
    productId: product.id,
    categoryId: product.categoryId,
    channel,
    isTabSale: false, // prefilled from normal-sales switch
    isReturnable,
    priceVersions,
    depositVersions,
    depositOnNormalSales,
    depositOnTabSales,
    cashierDepositWaived: depositWaived,
    offers,
    atTimestamp: now,
  });

  if (!breakdown) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-rose-300">
          Price not configured for this product and channel.
          <button
            onClick={onClose}
            className="mt-3 block w-full rounded bg-slate-800 py-1.5 text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    const lineItem: OrderLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      channel,
      qty,
      beerPrice: breakdown.beerPrice,
      addOn: breakdown.addOn,
      depositPortion: breakdown.depositPortion,
      depositWaived: breakdown.depositWaived,
      offerId: breakdown.offerId,
      offerDiscount: breakdown.offerDiscount,
      unitPrice: breakdown.unitPrice,
      total: breakdown.unitPrice * qty,
    };
    onConfirm(lineItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm">{product.name}</h3>
            <span className="text-[11px] text-slate-400 capitalize">
              {channel} Channel · Brand: {product.brand}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Price Breakdown */}
        <div className="mt-4 space-y-2 rounded-lg bg-slate-800/50 border border-slate-800 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Base Beer Price:</span>
            <span className="font-mono">{formatMoney(breakdown.beerPrice)}</span>
          </div>

          {breakdown.offerDiscount > 0 && (
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Happy Hour Discount:
              </span>
              <span className="font-mono">−{formatMoney(breakdown.offerDiscount)}</span>
            </div>
          )}

          {breakdown.addOn > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span>Outside Bar Add-On:</span>
              <span className="font-mono">+{formatMoney(breakdown.addOn)}</span>
            </div>
          )}

          {isOutside && isReturnable && (
            <div className="border-t border-slate-700/60 pt-2">
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1 text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Government Bottle Deposit:
                </span>
                <span className="font-mono text-emerald-400">
                  {breakdown.depositPortion > 0
                    ? `+${formatMoney(breakdown.depositPortion)}`
                    : "Waived (Rs. 0)"}
                </span>
              </div>

              {allowChangeMode ? (
                <label className="mt-2 flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={!depositWaived}
                    onChange={(e) => setDepositWaived(!e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include bottle deposit</span>
                </label>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  Deposit enforced by system setting (confirm only mode).
                </p>
              )}

              {depositWaived && (
                <p className="mt-1 text-[10px] text-amber-400">
                  * Deposit unticked: this bottle cannot be returned for a refund and will be flagged for admin review.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-slate-700/60 pt-2 flex items-center justify-between font-bold text-sm text-white">
            <span>Unit Price:</span>
            <span className="font-mono text-emerald-400">
              {formatMoney(breakdown.unitPrice)}
            </span>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Quantity:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 font-bold text-white hover:bg-slate-700"
            >
              −
            </button>
            <span className="w-10 text-center font-mono font-bold text-base text-white">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(qty + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 font-bold text-white hover:bg-slate-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Total & Confirm */}
        <div className="mt-5 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-slate-400">Line Total:</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatMoney(breakdown.unitPrice * qty)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-800 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500"
            >
              <Check className="h-4 w-4" />
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
