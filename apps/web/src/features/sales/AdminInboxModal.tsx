import React, { useState } from "react";
import type { ApprovalRequest } from "@/data/schemas/approvalRequest.schema";
import { approvalRequestsRepository } from "@/data/repositories/approvalRequestsRepository";
import { stockRepository } from "@/data/repositories/stockRepository";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { X, Loader2, Check, XCircle, Bell, ShieldCheck } from "lucide-react";

interface AdminInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  requests: ApprovalRequest[];
  adminId: string;
}

export const AdminInboxModal: React.FC<AdminInboxModalProps> = ({
  isOpen,
  onClose,
  clientId,
  requests,
  adminId,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const handleApprove = async (req: ApprovalRequest) => {
    try {
      setLoadingId(req.id);

      // If complimentary or staff drink, write to stock movement ledger
      if (
        (req.kind === "complimentary" || req.kind === "staff_drink") &&
        req.details.productId &&
        req.details.qty
      ) {
        await stockRepository.recordStockAdjustment(clientId, {
          productId: req.details.productId,
          type: req.kind,
          qty: -Math.abs(req.details.qty), // reduction
          reason: req.details.reason || `Approved ${req.kind.replace("_", " ")}`,
          cashierId: req.requestedBy,
          approvedBy: adminId,
        });
      }

      await approvalRequestsRepository.decideRequest(clientId, {
        requestId: req.id,
        status: "approved",
        decidedBy: adminId,
      });
    } catch (err) {
      console.error("Failed to approve request:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (req: ApprovalRequest) => {
    try {
      setLoadingId(req.id);
      const reason = rejectionNotes[req.id] || "Rejected by administrator";

      await approvalRequestsRepository.decideRequest(clientId, {
        requestId: req.id,
        status: "rejected",
        decidedBy: adminId,
        rejectionReason: reason,
      });

      setActiveRejectId(null);
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Administrator Approval Inbox</h2>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {pendingRequests.length} pending
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto space-y-3 pr-1">
          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <ShieldCheck className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              All caught up! No cashier requests awaiting approval.
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-400">
                      {req.kind.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      Requested by Cashier: <strong className="text-white">{req.requestedBy.slice(0, 10)}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatDateTime(req.at)}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-300">
                  {req.kind === "over_limit_tab" && (
                    <div>
                      Customer: <strong className="text-white">{req.details.customerName}</strong>
                      {req.details.amount && (
                        <div className="mt-0.5 font-mono text-emerald-400 font-semibold">
                          Order Amount: {formatMoney(req.details.amount)}
                        </div>
                      )}
                    </div>
                  )}

                  {(req.kind === "complimentary" || req.kind === "staff_drink") && (
                    <div>
                      Product: <strong className="text-white">{req.details.productId}</strong> · Qty:{" "}
                      <strong className="text-white">{req.details.qty}</strong>
                    </div>
                  )}

                  {req.details.reason && (
                    <p className="mt-1 text-slate-400 italic">
                      &quot;{req.details.reason}&quot;
                    </p>
                  )}
                </div>

                {/* Rejection Note Input */}
                {activeRejectId === req.id && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Reason for rejection (optional)..."
                      value={rejectionNotes[req.id] || ""}
                      onChange={(e) =>
                        setRejectionNotes({ ...rejectionNotes, [req.id]: e.target.value })
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  {activeRejectId === req.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveRejectId(null)}
                        className="rounded px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(req)}
                        disabled={loadingId === req.id}
                        className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Confirm Rejection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveRejectId(req.id)}
                        disabled={loadingId === req.id}
                        className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 hover:border-rose-500 hover:text-rose-400 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={loadingId === req.id}
                        className="flex items-center gap-1 rounded bg-emerald-600 px-3.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {loadingId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
