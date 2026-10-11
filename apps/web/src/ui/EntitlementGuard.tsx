import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { isEnabled, isBlocked, getStatusMessage, type EntitlementKind } from "@/domain/entitlements";
import type { ModuleId } from "@/registry/modules";
import type { TileId } from "@/registry/tiles";
import type { ReportId } from "@/registry/reports";
import type { SettingsTabId } from "@/registry/settingsTabs";
import { ShieldAlert, Lock } from "lucide-react";
import { LoadingSpinner } from "./components/LoadingSpinner";

interface EntitlementGuardProps {
  children: React.ReactNode;
  kind?: EntitlementKind;
  id?: ModuleId | TileId | ReportId | SettingsTabId;
  /** If this route requires a minimum role (e.g. client_admin or superadmin) */
  requiredRole?: "superadmin" | "client_admin" | "cashier";
  /** Fallback component to render if feature is not enabled (defaults to access denied screen) */
  fallback?: React.ReactNode;
}

export const EntitlementGuard: React.FC<EntitlementGuardProps> = ({
  children,
  kind = "module",
  id,
  requiredRole,
  fallback,
}) => {
  const { user, role, entitlements, loading, isSupportMode } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Checking permissions..." />;
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin has full access unless in support mode or checking superadmin role requirement
  if (role === "superadmin" && !isSupportMode) {
    return <>{children}</>;
  }

  // Check role requirement
  if (requiredRole) {
    if (requiredRole === "superadmin" && role !== "superadmin") {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-white">Super Admin Access Required</h2>
          <p className="mt-2 text-sm text-slate-400">
            This area is restricted to system administrators.
          </p>
        </div>
      );
    }

    if (requiredRole === "client_admin" && role === "cashier") {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <Lock className="h-12 w-12 text-amber-400" />
          <h2 className="mt-4 text-xl font-bold text-white">Administrator Access Required</h2>
          <p className="mt-2 text-sm text-slate-400">
            Cashiers do not have permission to access this settings or administration page.
          </p>
        </div>
      );
    }
  }

  // If no specific feature id to check, role check was sufficient
  if (!id) {
    return <>{children}</>;
  }

  // If client has no entitlements doc loaded yet
  if (!entitlements) {
    return <LoadingSpinner message="Loading client configuration..." />;
  }

  // Blocked client
  if (isBlocked(entitlements)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-white">Client Access Blocked</h2>
        <p className="mt-2 text-sm text-slate-400">{getStatusMessage(entitlements)}</p>
      </div>
    );
  }

  // Check feature switch
  const allowed = isEnabled(entitlements, kind, id);
  if (!allowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <Lock className="h-12 w-12 text-slate-500" />
        <h2 className="mt-4 text-xl font-bold text-white">Module Not Active</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {getStatusMessage(entitlements, String(id))}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
