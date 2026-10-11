import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Shield, Building2, PlusCircle, ArrowLeft } from "lucide-react";

export const SuperAdminLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Super Header */}
      <header className="border-b border-indigo-900/40 bg-indigo-950/30 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to App</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              <span className="text-base font-bold text-white">Super Admin Console</span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to="/super"
              className={`flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                location.pathname === "/super"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Clients</span>
            </Link>
            <Link
              to="/super/create-client"
              className={`flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                location.pathname === "/super/create-client"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Client</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
};
