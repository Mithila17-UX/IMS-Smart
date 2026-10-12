import React, { useState } from "react";
import type { OrderLineItem, PaymentMethod, PaymentSplitItem } from "@/data/schemas/order.schema";
import type { Customer } from "@/data/schemas/customer.schema";
import type { DiscountToken } from "@/data/schemas/bottleReturn.schema";
import { adjustLinesForPaymentMethod, calcOrderTotals, validateSplitPayment } from "@/domain/sales";
import { isOverCreditLimit, calcCreditAvailable } from "@/domain/credit";
import { ordersRepository } from "@/data/repositories/ordersRepository";
import { approvalRequestsRepository } from "@/data/repositories/approvalRequestsRepository";
import { formatMoney, parseToCents } from "@/lib/money";
import {
  X,
  Loader2,
  Banknote,
  CreditCard,
  UserCheck,
  Split,
  Tag,
  AlertTriangle,
  Send,
} from "lucide-react";

interface CloseOrderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  lines: OrderLineItem[];
  customers: Customer[];
  availableTokens: Array<{ returnId: string; token: DiscountToken }>;
  depositOnNormalSales: boolean;
  depositOnTabSales: boolean;
  depositRate: number;
  userId: string;
  onOrderCompleted: (orderId: string) => void;
}

export const CloseOrderPopup: React.FC<CloseOrderPopupProps> = ({
  isOpen,
  onClose,
  clientId,
  lines,
  customers,
  availableTokens,
  depositOnNormalSales,
  depositOnTabSales,
  depositRate,
  userId,
  onOrderCompleted,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Split payments state
  const [splitCashInput, setSplitCashInput] = useState("");
  const [splitCardInput, setSplitCardInput] = useState("");
  const [splitTabInput, setSplitTabInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isTab = paymentMethod === "tab";

  // Re-adjust lines according to normal vs tab deposit settings
  const adjustedLines = adjustLinesForPaymentMethod(
    lines,
    isTab,
    depositOnNormalSales,
    depositOnTabSales,
    depositRate,
  );

  // Selected discount token
  const selectedTokenObj = availableTokens.find((t) => t.token.tokenId === selectedTokenId);
  const bottleDiscountAmount = selectedTokenObj ? selectedTokenObj.token.amount : 0;

  // Compute order totals
  const totals = calcOrderTotals(adjustedLines, bottleDiscountAmount);

  // Selected customer
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Credit limit check
  const tabAmountToCheck = isTab
    ? totals.grandTotal
    : parseToCents(splitTabInput);

  const isExceedingCredit =
    selectedCustomer && tabAmountToCheck > 0
      ? isOverCreditLimit(selectedCustomer.creditLimit, selectedCustomer.balance, tabAmountToCheck)
      : false;

  const handleSendApprovalRequest = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer for the tab.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await approvalRequestsRepository.createRequest(clientId, {
        kind: "over_limit_tab",
        requestedBy: userId,
        details: {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          amount: tabAmountToCheck,
          reason: `Tab sale of ${formatMoney(tabAmountToCheck)} exceeds credit limit (${formatMoney(selectedCustomer.creditLimit)})`,
          orderDraft: {
            lines: adjustedLines,
            grandTotal: totals.grandTotal,
          },
        },
      });

      setRequestSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if ((paymentMethod === "tab" || parseToCents(splitTabInput) > 0) && !selectedCustomerId) {
      setError("Please select a customer account for the tab.");
      return;
    }

    if (isExceedingCredit) {
      setError("This sale exceeds the customer's credit limit. Send an admin approval request.");
      return;
    }

    let splitPaymentsList: PaymentSplitItem[] | undefined = undefined;

    if (paymentMethod === "split") {
      const candidateList: PaymentSplitItem[] = [
        { method: "cash" as const, amount: parseToCents(splitCashInput) },
        { method: "card" as const, amount: parseToCents(splitCardInput) },
        { method: "tab" as const, amount: parseToCents(splitTabInput) },
      ].filter((s) => s.amount > 0);

      const splitValidation = validateSplitPayment(totals.grandTotal, candidateList);
      if (!splitValidation.valid) {
        setError(
          `Split amounts total ${formatMoney(
            totals.grandTotal - splitValidation.difference,
          )}, but order total is ${formatMoney(totals.grandTotal)}. Difference: ${formatMoney(
            Math.abs(splitValidation.difference),
          )}.`,
        );
        return;
      }
      splitPaymentsList = candidateList;
    }

    try {
      setLoading(true);
      setError(null);

      const orderId = await ordersRepository.closeOrder(clientId, {
        lines: adjustedLines,
        totalBeerAmount: totals.totalBeerAmount,
        totalDepositAmount: totals.totalDepositAmount,
        totalDiscountAmount: totals.totalDiscountAmount,
        bottleDiscountAmount: totals.bottleDiscountAmount,
        bottleDiscountTokenId: selectedTokenObj ? selectedTokenObj.returnId : undefined,
        grandTotal: totals.grandTotal,
        paymentMethod,
        splitPayments: splitPaymentsList,
        customerId: selectedCustomerId || undefined,
        cashierId: userId,
        notes: notes.trim() || undefined,
      });

      onOrderCompleted(orderId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">Close Order & Collect Payment</h2>
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

        {requestSent && (
          <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            ✓ Over-limit approval request sent to Admin inbox. Order will wait for admin approval.
          </div>
        )}

        {/* Order Line Items Review */}
        <div className="mt-3 max-h-36 overflow-y-auto space-y-1.5 border border-slate-800 rounded-lg p-2.5 bg-slate-950/40 text-xs">
          {adjustedLines.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-slate-300">
              <div>
                <span className="font-semibold text-white">
                  {line.qty}x {line.productName}
                </span>{" "}
                <span className="text-[11px] text-slate-500 capitalize">({line.channel})</span>
                {line.depositPortion > 0 ? (
                  <span className="text-[10px] text-emerald-400 ml-1">
                    +dep {formatMoney(line.depositPortion * line.qty)}
                  </span>
                ) : line.channel === "outside" ? (
                  <span className="text-[10px] text-amber-400 ml-1">No deposit</span>
                ) : null}
              </div>
              <div className="font-mono font-semibold text-white">{formatMoney(line.total)}</div>
            </div>
          ))}
        </div>

        {/* Payment Method Selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-semibold transition ${
                paymentMethod === "cash"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              <Banknote className="h-4 w-4" />
              Cash
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-semibold transition ${
                paymentMethod === "card"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Card
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("tab")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-semibold transition ${
                paymentMethod === "tab"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Tab (Credit)
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("split")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-semibold transition ${
                paymentMethod === "split"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              <Split className="h-4 w-4" />
              Split
            </button>
          </div>
        </div>

        {/* Tab Customer Picker */}
        {(paymentMethod === "tab" || paymentMethod === "split") && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Select Tab Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">-- Choose Customer --</option>
              {customers
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Balance: {formatMoney(c.balance)} / Limit: {formatMoney(c.creditLimit)}
                  </option>
                ))}
            </select>

            {selectedCustomer && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Available credit:{" "}
                  <strong
                    className={
                      calcCreditAvailable(selectedCustomer.creditLimit, selectedCustomer.balance) < 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }
                  >
                    {formatMoney(
                      calcCreditAvailable(selectedCustomer.creditLimit, selectedCustomer.balance),
                    )}
                  </strong>
                </span>
                {isExceedingCredit && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    Over Limit
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Split Payments Inputs */}
        {paymentMethod === "split" && (
          <div className="mt-3 space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-800/30">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Split Allocation (LKR)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cash</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitCashInput}
                  onChange={(e) => setSplitCashInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Card</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitCardInput}
                  onChange={(e) => setSplitCardInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tab</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitTabInput}
                  onChange={(e) => setSplitTabInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottle Return Discount Token Picker */}
        {availableTokens.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Apply Returned Bottle Discount Token
            </label>
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">-- Do not apply discount token --</option>
              {availableTokens.map((t) => (
                <option key={t.token.tokenId} value={t.token.tokenId}>
                  Token {t.token.tokenId.slice(0, 8)} — {formatMoney(t.token.amount)} discount
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Totals Summary Card */}
        <div className="mt-4 rounded-xl bg-slate-800/80 border border-slate-700/80 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Beer & Add-Ons:</span>
            <span className="font-mono">{formatMoney(totals.totalBeerAmount)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span>Bottle Deposits:</span>
            <span className="font-mono">{formatMoney(totals.totalDepositAmount)}</span>
          </div>

          {totals.bottleDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Bottle Return Discount:
              </span>
              <span className="font-mono">−{formatMoney(totals.bottleDiscountAmount)}</span>
            </div>
          )}

          <div className="border-t border-slate-700 pt-2 flex items-center justify-between text-base font-bold text-white">
            <span>Grand Total:</span>
            <span className="font-mono text-emerald-400 text-lg">
              {formatMoney(totals.grandTotal)}
            </span>
          </div>
        </div>

        {/* Order Notes */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Order notes (optional, e.g. Table 4, VIP)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          {isExceedingCredit ? (
            <button
              type="button"
              onClick={handleSendApprovalRequest}
              disabled={loading || requestSent}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Request Admin Approval
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteOrder}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Complete Sale
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
