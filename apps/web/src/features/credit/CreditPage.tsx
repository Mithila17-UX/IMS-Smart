import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { customersRepository } from "@/data/repositories/customersRepository";
import type { Customer, DueExtension } from "@/data/schemas/customer.schema";
import { calcCustomerDueDate, isTabOverdue } from "@/domain/credit";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { CustomerModal } from "./CustomerModal";
import { TabPaymentModal } from "./TabPaymentModal";
import { ExtendDueDateModal } from "./ExtendDueDateModal";
import {
  UserCheck,
  Plus,
  AlertTriangle,
  Banknote,
  Calendar,
  Edit2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export const CreditPage: React.FC = () => {
  const { effectiveClientId, user, role } = useAuth();
  const isAdmin = role === "client_admin" || role === "superadmin";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [extensions, setExtensions] = useState<DueExtension[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendCustomer, setExtendCustomer] = useState<Customer | null>(null);
  const [extendCurrentDue, setExtendCurrentDue] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveClientId) return;
    setLoading(true);

    const unsubCusts = customersRepository.subscribeCustomers(
      effectiveClientId,
      (custs) => {
        setCustomers(custs);
        setLoading(false);
      },
      (err) => console.error("Customers err:", err),
    );

    const unsubExts = customersRepository.subscribeDueExtensions(
      effectiveClientId,
      (exts) => setExtensions(exts),
      (err) => console.error("Extensions err:", err),
    );

    return () => {
      unsubCusts();
      unsubExts();
    };
  }, [effectiveClientId]);

  // Today's business date (YYYY-MM-DD)
  const todayDate = new Date().toISOString().slice(0, 10);
  const defaultDueDays = 30; // setting default

  // Metrics
  const totalOutstanding = customers.reduce((acc, c) => acc + c.balance, 0);

  // Latest extensions per customer
  const extensionMap = new Map<string, DueExtension>();
  extensions.forEach((ext) => {
    if (!extensionMap.has(ext.customerId)) {
      extensionMap.set(ext.customerId, ext);
    }
  });

  const overdueCount = customers.filter((c) => {
    if (c.balance <= 0) return false;
    const latestExt = extensionMap.get(c.id);
    const dueDate = calcCustomerDueDate(
      c.oldestUnpaidDate,
      defaultDueDays,
      c.dueDaysOverride,
      latestExt?.newDueDate,
    );
    return isTabOverdue(dueDate, todayDate);
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-emerald-400" />
            Customer Tabs & Credit Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage patron credit balances, repayments, credit limits, and due date extensions.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setCustomerModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            Add Tab Customer
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Outstanding Credit</span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {formatMoney(totalOutstanding)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Across all customer tabs</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overdue Accounts</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              overdueCount > 0 ? "text-amber-400" : "text-white"
            }`}
          >
            {overdueCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Accounts past payment deadline</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Customers</span>
            <ShieldCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {customers.filter((c) => c.active).length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Registered with credit terms</div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Name & Phone</th>
                <th className="py-3 px-4">Current Balance</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Utilization</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No tab customers registered yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const latestExt = extensionMap.get(c.id);
                  const dueDate = calcCustomerDueDate(
                    c.oldestUnpaidDate,
                    defaultDueDays,
                    c.dueDaysOverride,
                    latestExt?.newDueDate,
                  );
                  const isOverdue = c.balance > 0 && isTabOverdue(dueDate, todayDate);
                  const utilization =
                    c.creditLimit > 0
                      ? Math.min(100, Math.round((c.balance / c.creditLimit) * 100))
                      : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <span className={c.balance > 0 ? "text-emerald-400" : "text-slate-400"}>
                          {formatMoney(c.balance)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatMoney(c.creditLimit)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                utilization >= 90
                                  ? "bg-rose-500"
                                  : utilization >= 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {utilization}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {c.balance <= 0 ? (
                          <span className="text-slate-500 italic">No balance</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-300">{dueDate || "—"}</span>
                            {isOverdue && (
                              <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                                Overdue
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.balance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentCustomer(c);
                                setPaymentModalOpen(true);
                              }}
                              className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                            >
                              Pay Tab
                            </button>
                          )}

                          {isAdmin && c.balance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExtendCustomer(c);
                                setExtendCurrentDue(dueDate);
                                setExtendModalOpen(true);
                              }}
                              className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition"
                              title="Extend Due Date"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomer(c);
                                setCustomerModalOpen(true);
                              }}
                              className="rounded p-1 text-slate-400 hover:text-white transition"
                              title="Edit Customer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Due Date Extension History */}
      {extensions.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Clock className="h-4 w-4 text-slate-400" />
            Due Date Extensions History ({extensions.length})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Date Changed</th>
                  <th className="py-2.5 px-4">Customer ID</th>
                  <th className="py-2.5 px-4">New Due Date</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {extensions.map((ext) => (
                  <tr key={ext.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {formatDateTime(ext.at)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">{ext.customerId}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">
                      {ext.newDueDate}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">{ext.reason}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      {ext.changedBy.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {effectiveClientId && (
        <>
          <CustomerModal
            isOpen={customerModalOpen}
            onClose={() => setCustomerModalOpen(false)}
            clientId={effectiveClientId}
            customerToEdit={editingCustomer}
          />

          {paymentCustomer && (
            <TabPaymentModal
              isOpen={paymentModalOpen}
              onClose={() => {
                setPaymentModalOpen(false);
                setPaymentCustomer(null);
              }}
              clientId={effectiveClientId}
              customer={paymentCustomer}
              userId={user?.uid || "cashier"}
            />
          )}

          {extendCustomer && (
            <ExtendDueDateModal
              isOpen={extendModalOpen}
              onClose={() => {
                setExtendModalOpen(false);
                setExtendCustomer(null);
              }}
              clientId={effectiveClientId}
              customer={extendCustomer}
              currentDueDate={extendCurrentDue}
              adminId={user?.uid || "admin"}
            />
          )}
        </>
      )}
    </div>
  );
};
