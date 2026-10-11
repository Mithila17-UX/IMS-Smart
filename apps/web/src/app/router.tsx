import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { AppShell } from "@/ui/AppShell";
import { EntitlementGuard } from "@/ui/EntitlementGuard";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { StockPage } from "@/features/stock/StockPage";
import { SuperAdminLayout } from "@/features/super/SuperAdminLayout";
import { ClientsListPage } from "@/features/super/ClientsListPage";
import { CreateClientPage } from "@/features/super/CreateClientPage";
import { ClientDetailPage } from "@/features/super/ClientDetailPage";

// Generic placeholder for modules scheduled in subsequent phases
const ModulePlaceholder: React.FC<{ name: string; phase: string }> = ({ name, phase }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
    <h2 className="text-xl font-bold text-white">{name}</h2>
    <p className="text-sm text-slate-400">
      This module is registered and entitlement-guarded. Scheduled for implementation in {phase}.
    </p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <EntitlementGuard>
        <AppShell>
          <Navigate to="/dashboard" replace />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <EntitlementGuard kind="module" id="dashboard">
        <AppShell>
          <DashboardPage />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/sales",
    element: (
      <EntitlementGuard kind="module" id="liveOrders">
        <AppShell>
          <ModulePlaceholder name="Live Tally & Sales" phase="Phase 3" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/products",
    element: (
      <EntitlementGuard kind="module" id="products">
        <AppShell>
          <ProductsPage />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/stock",
    element: (
      <EntitlementGuard kind="module" id="stock">
        <AppShell>
          <StockPage />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/shifts",
    element: (
      <EntitlementGuard kind="module" id="dayClose">
        <AppShell>
          <ModulePlaceholder name="Day Close & Reconciliation" phase="Phase 4" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/credit",
    element: (
      <EntitlementGuard kind="module" id="tabs">
        <AppShell>
          <ModulePlaceholder name="Tabs & Credit Accounts" phase="Phase 3" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/offers",
    element: (
      <EntitlementGuard kind="module" id="offers">
        <AppShell>
          <ModulePlaceholder name="Offers & Happy Hour" phase="Phase 3" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/expenses",
    element: (
      <EntitlementGuard kind="module" id="expenses">
        <AppShell>
          <ModulePlaceholder name="Expenses & Drawer Cash" phase="Phase 3" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/reports",
    element: (
      <EntitlementGuard kind="module" id="reports">
        <AppShell>
          <ModulePlaceholder name="Reports & Analytics" phase="Phase 5" />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  {
    path: "/settings",
    element: (
      <EntitlementGuard requiredRole="client_admin">
        <AppShell>
          <SettingsPage />
        </AppShell>
      </EntitlementGuard>
    ),
  },
  // Super Admin Routes
  {
    path: "/super",
    element: (
      <EntitlementGuard requiredRole="superadmin">
        <SuperAdminLayout />
      </EntitlementGuard>
    ),
    children: [
      {
        index: true,
        element: <ClientsListPage />,
      },
      {
        path: "create-client",
        element: <CreateClientPage />,
      },
      {
        path: "clients/:clientId",
        element: <ClientDetailPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
