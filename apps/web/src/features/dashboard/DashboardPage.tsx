import React from "react";
import { useAuth } from "@/features/auth/useAuth";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, role, effectiveClientId, entitlements, isSupportMode } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/40 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Building2 className="h-4 w-4" />
              <span>Tenant: {effectiveClientId}</span>
              {isSupportMode && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                  Support Mode
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white">Bar Operations Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Welcome back, <span className="text-slate-200">{user?.email}</span> ({role?.replace("_", " ")}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/sales"
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Open Sales Tally</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Today's Cash Sales</span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">Open Day</span>
          </div>
          <div className="text-3xl font-extrabold text-white">Rs. 0.00</div>
          <p className="text-xs text-slate-500">Live drawer cash since 09:00 AM</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Bottle Deposits Out</span>
            <span className="text-xs text-slate-400 font-mono">0 units</span>
          </div>
          <div className="text-3xl font-extrabold text-white">Rs. 0.00</div>
          <p className="text-xs text-slate-500">Current customer refund exposure</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Open Shift Status</span>
            <span className="text-xs text-emerald-400">Balanced</span>
          </div>
          <div className="text-3xl font-extrabold text-white">0 Variances</div>
          <p className="text-xs text-slate-500">Reconciliation within 1 bottle tolerance</p>
        </div>
      </div>

      {/* Phase 1 Status Callout */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <span>Multi-Tenant Core Online (Phase 1)</span>
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          The foundation and multi-client core is established with isolated Firestore rules, custom authentication claims, and a dynamic feature registry. Active modules for this tenant:{" "}
          <span className="font-semibold text-emerald-400">
            {Object.entries(entitlements?.modules || {})
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ") || "None"}
          </span>
          .
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/products"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Package className="h-4 w-4 text-indigo-400" />
            <span>Catalogue</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/shifts"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>Day Reconciliation</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          {role === "client_admin" && (
            <Link
              to="/settings"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <span>Settings Engine</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
