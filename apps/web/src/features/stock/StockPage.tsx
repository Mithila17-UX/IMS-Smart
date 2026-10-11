import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { productsRepository } from "@/data/repositories/productsRepository";
import { stockRepository } from "@/data/repositories/stockRepository";
import { suppliersRepository } from "@/data/repositories/suppliersRepository";
import type { Product } from "@/data/schemas/product.schema";
import type { Supplier, Purchase } from "@/data/schemas/supplier.schema";
import type { StockMovement } from "@/data/schemas/stockMovement.schema";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { PurchaseEntryModal } from "./PurchaseEntryModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { SuppliersModal } from "./SuppliersModal";
import {
  Truck,
  Plus,
  AlertTriangle,
  Building2,
  Package,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";

export const StockPage: React.FC = () => {
  const { effectiveClientId, user, role } = useAuth();
  const isAdmin = role === "client_admin" || role === "superadmin";

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"inventory" | "ledger" | "deliveries">("inventory");

  // Modals
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [suppliersModalOpen, setSuppliersModalOpen] = useState(false);

  useEffect(() => {
    if (!effectiveClientId) return;
    setLoading(true);

    const unsubProds = productsRepository.subscribeAllProducts(
      effectiveClientId,
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      (err) => console.error("Products error:", err),
    );

    const unsubSupps = suppliersRepository.subscribeAllSuppliers(
      effectiveClientId,
      (supps) => setSuppliers(supps),
      (err) => console.error("Suppliers error:", err),
    );

    const unsubMovements = stockRepository.subscribeStockMovements(
      effectiveClientId,
      (movs) => setMovements(movs),
      (err) => console.error("Movements error:", err),
    );

    const unsubPurchases = stockRepository.subscribePurchases(
      effectiveClientId,
      (purs) => setPurchases(purs),
      (err) => console.error("Purchases error:", err),
    );

    return () => {
      unsubProds();
      unsubSupps();
      unsubMovements();
      unsubPurchases();
    };
  }, [effectiveClientId]);

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const supplierMap = new Map<string, Supplier>();
  suppliers.forEach((s) => supplierMap.set(s.id, s));

  // Metrics
  const totalUnitsOnHand = products.reduce((sum, p) => sum + p.stockOnHand, 0);
  const totalInventoryValueCents = products.reduce(
    (sum, p) => sum + p.stockOnHand * p.avgCost,
    0,
  );
  const lowStockCount = products.filter((p) => p.stockOnHand <= p.reorderPoint).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-emerald-400" />
            Stock & Deliveries
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier deliveries, real-time stock ledger, weighted average cost (WAC), and wastage tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSuppliersModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <Building2 className="h-4 w-4 text-slate-400" />
            Suppliers ({suppliers.length})
          </button>

          <button
            onClick={() => setAdjustmentModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Log Wastage / Spoilage
          </button>

          <button
            onClick={() => setPurchaseModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Record Delivery (Stock In)
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Units on Hand</span>
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {totalUnitsOnHand}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Across {products.length} catalog items</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Inventory Valuation (WAC)</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {formatMoney(totalInventoryValueCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Based on weighted average costs</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              lowStockCount > 0 ? "text-amber-400" : "text-white"
            }`}
          >
            {lowStockCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Items at or below reorder threshold</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Deliveries Logged</span>
            <ClipboardList className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {purchases.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">From {suppliers.length} active suppliers</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 text-xs font-semibold transition border-b-2 ${
              activeTab === "inventory"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-xs font-semibold transition border-b-2 ${
              activeTab === "ledger"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Stock Movement Ledger ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`pb-3 text-xs font-semibold transition border-b-2 ${
              activeTab === "deliveries"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Deliveries History ({purchases.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Current Stock Levels */}
      {activeTab === "inventory" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Brand & Product</th>
                  <th className="py-3 px-4">Stock on Hand</th>
                  <th className="py-3 px-4">Reorder Point</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Weighted Avg Cost (WAC)</th>
                  <th className="py-3 px-4 text-right">Inventory Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No products found. Add products in the catalogue.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                  const isLow = p.stockOnHand <= p.reorderPoint;
                  const totalValuation = p.stockOnHand * p.avgCost;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{p.name}</span>
                        <span className="text-[11px] text-slate-400">{p.brand}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                        {p.stockOnHand}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.reorderPoint}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {p.avgCost > 0 ? formatMoney(p.avgCost) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-semibold text-emerald-400">
                        {formatMoney(totalValuation)}
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movement Ledger (Append-Only) */}
      {activeTab === "ledger" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Qty Change</th>
                  <th className="py-3 px-4">Unit Price / Cost</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const prod = productMap.get(m.productId);
                    const isPositive = m.qty > 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {formatDateTime(m.at)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              m.type === "purchase"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : m.type === "sale"
                                ? "bg-sky-500/10 border border-sky-500/30 text-sky-400"
                                : m.type === "wastage"
                                ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                                : m.type === "staff_drink"
                                ? "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {m.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">
                            {prod?.name || m.productId}
                          </span>
                          <span className="text-[10px] text-slate-400">{prod?.brand}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                            {isPositive ? `+${m.qty}` : m.qty}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {m.unitPrice !== undefined ? formatMoney(m.unitPrice) : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                          {m.reason || (m.channel ? `Channel: ${m.channel}` : "—")}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {m.cashierId.slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Deliveries History */}
      {activeTab === "deliveries" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Delivered On</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Line Items</th>
                  <th className="py-3 px-4">Total Units</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4 text-right">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No supplier deliveries recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchases.map((pur) => {
                    const supp = supplierMap.get(pur.supplierId);
                    const unitsCount = pur.lines.reduce((acc, l) => acc + l.qty, 0);
                    const costCents = pur.lines.reduce((acc, l) => acc + l.qty * l.unitCost, 0);

                    return (
                      <tr key={pur.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {pur.deliveredOn}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {supp?.name || pur.supplierId}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {pur.reference || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {pur.lines.length} {pur.lines.length === 1 ? "item" : "items"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {unitsCount}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          {formatMoney(costCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                          {pur.recordedBy.slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {effectiveClientId && (
        <>
          <PurchaseEntryModal
            isOpen={purchaseModalOpen}
            onClose={() => setPurchaseModalOpen(false)}
            clientId={effectiveClientId}
            products={products}
            suppliers={suppliers}
            userId={user?.uid || "admin"}
          />

          <StockAdjustmentModal
            isOpen={adjustmentModalOpen}
            onClose={() => setAdjustmentModalOpen(false)}
            clientId={effectiveClientId}
            products={products}
            userId={user?.uid || "admin"}
            isAdmin={isAdmin}
          />

          <SuppliersModal
            isOpen={suppliersModalOpen}
            onClose={() => setSuppliersModalOpen(false)}
            clientId={effectiveClientId}
            suppliers={suppliers}
          />
        </>
      )}
    </div>
  );
};
