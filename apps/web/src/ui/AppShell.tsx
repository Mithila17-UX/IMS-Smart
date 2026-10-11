import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { isEnabled } from "@/domain/entitlements";
import { OfflineBanner } from "./components/OfflineBanner";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Clock,
  CreditCard,
  Tag,
  DollarSign,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Search,
  EyeOff,
  type LucideIcon,
} from "lucide-react";

import { GlobalProductSearchModal } from "@/features/products/GlobalProductSearchModal";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  moduleId?: string;
  adminOnly?: boolean;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, entitlements, signOut, isSupportMode, supportClientId, exitSupportMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, moduleId: "dashboard" },
    { name: "Sales & Tally", href: "/sales", icon: ShoppingCart, moduleId: "liveOrders" },
    { name: "Products", href: "/products", icon: Package, moduleId: "products" },
    { name: "Stock & Deliveries", href: "/stock", icon: Truck, moduleId: "stock" },
    { name: "Day Close", href: "/shifts", icon: Clock, moduleId: "dayClose" },
    { name: "Tabs (Credit)", href: "/credit", icon: CreditCard, moduleId: "tabs" },
    { name: "Offers", href: "/offers", icon: Tag, moduleId: "offers" },
    { name: "Expenses", href: "/expenses", icon: DollarSign, moduleId: "expenses" },
    { name: "Reports", href: "/reports", icon: BarChart3, moduleId: "reports" },
    { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && role === "cashier") return false;
    if (role === "superadmin" && !isSupportMode) return true;
    if (!item.moduleId) return true;
    if (!entitlements) return false;
    return isEnabled(entitlements, "module", item.moduleId as never);
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <OfflineBanner />

      {/* Support Mode Alert Banner */}
      {isSupportMode && (
        <div className="flex items-center justify-between bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-300">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Support Mode: Viewing client `{supportClientId}` in read-only mode</span>
          </div>
          <button
            onClick={() => {
              exitSupportMode();
              navigate("/super");
            }}
            className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500"
          >
            Exit Support Mode
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-400 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold text-white tracking-tight">IMS</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                Avalon Digital
              </div>
            </div>
          </Link>
        </div>

        {/* Global Product Search Trigger */}
        <div className="hidden max-w-sm flex-1 px-6 md:block">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full relative text-left cursor-pointer"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              readOnly
              placeholder="Search products, brands (Press /)"
              className="w-full min-h-[40px] cursor-pointer rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-500 hover:border-slate-700 focus:outline-none"
            />
          </button>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-slate-200">{user?.email}</div>
            <div className="text-[10px] capitalize text-slate-400">{role?.replace("_", " ") || "User"}</div>
          </div>

          {role === "superadmin" && (
            <Link
              to="/super"
              className="hidden rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 sm:block"
            >
              Super Console
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/40 p-4 md:block">
          <nav className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {role === "superadmin" && (
              <div className="pt-4 mt-4 border-t border-slate-800">
                <Link
                  to="/super"
                  className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-950/40`}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
                  <span>Super Console</span>
                </Link>
              </div>
            )}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-50 flex flex-col bg-slate-950 p-4 md:hidden">
            <nav className="space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {role === "superadmin" && (
                <div className="pt-4 border-t border-slate-800">
                  <Link
                    to="/super"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-indigo-300 hover:bg-indigo-950/40"
                  >
                    <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
                    <span>Super Admin Console</span>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <GlobalProductSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
};
