import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { productsRepository } from "@/data/repositories/productsRepository";
import { ordersRepository } from "@/data/repositories/ordersRepository";
import { customersRepository } from "@/data/repositories/customersRepository";
import { offersRepository } from "@/data/repositories/offersRepository";
import { bottleReturnsRepository } from "@/data/repositories/bottleReturnsRepository";
import { approvalRequestsRepository } from "@/data/repositories/approvalRequestsRepository";
import { stockRepository } from "@/data/repositories/stockRepository";
import type { Product, Category, PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import type { Customer } from "@/data/schemas/customer.schema";
import type { Offer } from "@/data/schemas/offer.schema";
import type { Order, OrderLineItem } from "@/data/schemas/order.schema";
import type { BottleReturn, DiscountToken } from "@/data/schemas/bottleReturn.schema";
import type { StockMovement } from "@/data/schemas/stockMovement.schema";
import type { ApprovalRequest } from "@/data/schemas/approvalRequest.schema";
import { getCurrentPrice, getCurrentDeposit } from "@/domain/prices";
import { resolveSalePrice, calcOrderTotals } from "@/domain/sales";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { AddItemPopup } from "./AddItemPopup";
import { CloseOrderPopup } from "./CloseOrderPopup";
import { BottleReturnModal } from "./BottleReturnModal";
import { ManualSalesEntryModal } from "./ManualSalesEntryModal";
import { AdminInboxModal } from "./AdminInboxModal";
import {
  ShoppingCart,
  RotateCcw,
  Calendar,
  Bell,
  Trash2,
  CheckCircle2,
  Package,
  History,
} from "lucide-react";

export const SalesPage: React.FC = () => {
  const { effectiveClientId, user, role } = useAuth();
  const isAdmin = role === "client_admin" || role === "superadmin";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceVersions, setPriceVersions] = useState<PriceVersion[]>([]);
  const [depositVersions, setDepositVersions] = useState<DepositVersion[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [allReturns, setAllReturns] = useState<BottleReturn[]>([]);
  const [availableTokens, setAvailableTokens] = useState<
    Array<{ returnId: string; token: DiscountToken }>
  >([]);
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Active channel for quick tally
  const [channel, setChannel] = useState<"inside" | "outside">("inside");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Current live order basket
  const [currentLines, setCurrentLines] = useState<OrderLineItem[]>([]);

  // 60-second Undo tracking
  const [lastClosedOrder, setLastClosedOrder] = useState<{ id: string; timestamp: number } | null>(
    null,
  );

  // Modals state
  const [addItemProduct, setAddItemProduct] = useState<Product | null>(null);
  const [closeOrderOpen, setCloseOrderOpen] = useState(false);
  const [bottleReturnOpen, setBottleReturnOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [adminInboxOpen, setAdminInboxOpen] = useState(false);

  useEffect(() => {
    if (!effectiveClientId) return;
    setLoading(true);

    const unsubProds = productsRepository.subscribeProducts(
      effectiveClientId,
      (p) => setProducts(p),
      (err) => console.error("Products err:", err),
    );

    const unsubCats = productsRepository.subscribeCategories(
      effectiveClientId,
      (c) => setCategories(c),
      (err) => console.error("Categories err:", err),
    );

    const unsubPrices = productsRepository.subscribePriceVersions(
      effectiveClientId,
      (pv) => setPriceVersions(pv),
      (err) => console.error("Prices err:", err),
    );

    const unsubDeposits = productsRepository.subscribeDepositVersions(
      effectiveClientId,
      (dv) => setDepositVersions(dv),
      (err) => console.error("Deposits err:", err),
    );

    const unsubCusts = customersRepository.subscribeCustomers(
      effectiveClientId,
      (c) => setCustomers(c),
      (err) => console.error("Customers err:", err),
    );

    const unsubOffers = offersRepository.subscribeOffers(
      effectiveClientId,
      (o) => setOffers(o),
      (err) => console.error("Offers err:", err),
    );

    const unsubOrders = ordersRepository.subscribeOrders(
      effectiveClientId,
      (ords) => {
        setRecentOrders(ords);
        setLoading(false);
      },
      (err) => {
        console.error("Orders err:", err);
        setLoading(false);
      },
    );

    const unsubTokens = bottleReturnsRepository.subscribeAvailableDiscountTokens(
      effectiveClientId,
      (toks) => setAvailableTokens(toks),
      (err) => console.error("Tokens err:", err),
    );

    const unsubRequests = approvalRequestsRepository.subscribePendingRequests(
      effectiveClientId,
      (reqs) => setPendingRequests(reqs),
      (err) => console.error("Requests err:", err),
    );

    const unsubMovs = stockRepository.subscribeStockMovements(
      effectiveClientId,
      (m) => setAllMovements(m),
      (err) => console.error("Movements err:", err),
      500,
    );

    return () => {
      unsubProds();
      unsubCats();
      unsubPrices();
      unsubDeposits();
      unsubCusts();
      unsubOffers();
      unsubOrders();
      unsubTokens();
      unsubRequests();
      unsubMovs();
    };
  }, [effectiveClientId]);

  // Load bottle returns for validation
  useEffect(() => {
    if (!effectiveClientId) return;
    void bottleReturnsRepository.getAllBottleReturns(effectiveClientId).then((rets) => {
      setAllReturns(rets);
    });
  }, [effectiveClientId, bottleReturnOpen]);

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const filteredProducts =
    selectedCategoryId === "all"
      ? products
      : products.filter((p) => p.categoryId === selectedCategoryId);

  // Tapping a product tile
  const handleProductTileClick = (product: Product) => {
    const cat = categoryMap.get(product.categoryId);
    const isReturnable = cat?.returnableContainer ?? false;

    // Outside items with returnable containers open the AddItem popup
    if (channel === "outside" && isReturnable) {
      setAddItemProduct(product);
      return;
    }

    // Direct addition for inside items (or outside items without deposit)
    const now = new Date().toISOString();
    const resolved = resolveSalePrice({
      productId: product.id,
      categoryId: product.categoryId,
      channel,
      isTabSale: false,
      isReturnable: false,
      priceVersions,
      depositVersions,
      depositOnNormalSales: true,
      depositOnTabSales: true,
      cashierDepositWaived: false,
      offers,
      atTimestamp: now,
    });

    if (!resolved) {
      alert("Price not set for this channel.");
      return;
    }

    // Check if line already exists in basket for same product & channel
    const existingIndex = currentLines.findIndex(
      (l) => l.productId === product.id && l.channel === channel && !l.depositPortion,
    );

    if (existingIndex >= 0) {
      const updated = [...currentLines];
      const existing = updated[existingIndex];
      if (existing) {
        const newQty = existing.qty + 1;
        updated[existingIndex] = {
          ...existing,
          qty: newQty,
          total: existing.unitPrice * newQty,
        };
        setCurrentLines(updated);
      }
    } else {
      const newLine: OrderLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        channel,
        qty: 1,
        beerPrice: resolved.beerPrice,
        addOn: resolved.addOn,
        depositPortion: 0,
        depositWaived: false,
        offerId: resolved.offerId,
        offerDiscount: resolved.offerDiscount,
        unitPrice: resolved.unitPrice,
        total: resolved.unitPrice,
      };
      setCurrentLines((prev) => [...prev, newLine]);
    }
  };

  const handleUpdateLineQty = (lineId: string, delta: number) => {
    setCurrentLines((prev) =>
      prev
        .map((l) => {
          if (l.id === lineId) {
            const newQty = l.qty + delta;
            return newQty > 0
              ? { ...l, qty: newQty, total: l.unitPrice * newQty }
              : null;
          }
          return l;
        })
        .filter((l): l is OrderLineItem => l !== null),
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setCurrentLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Basket totals
  const basketTotals = calcOrderTotals(currentLines, 0);

  const handleOrderCompleted = (orderId: string) => {
    setCurrentLines([]);
    setLastClosedOrder({ id: orderId, timestamp: Date.now() });
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShoppingCart className="h-7 w-7 text-emerald-400" />
            Live Tally & Sales
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tap product tiles to build customer tally ticket; fast, offline-friendly, no printing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Toggle */}
          <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setChannel("inside")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                channel === "inside"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Inside Bar
            </button>
            <button
              type="button"
              onClick={() => setChannel("outside")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                channel === "outside"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Outside (Takeaway)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setBottleReturnOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
            Bottle Return
          </button>

          <button
            type="button"
            onClick={() => setManualEntryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Manual Entry
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminInboxOpen(true)}
              className="relative flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              Inbox
              {pendingRequests.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 60-Second Undo Banner */}
      {lastClosedOrder && Date.now() - lastClosedOrder.timestamp < 60000 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Order #{lastClosedOrder.id.slice(0, 8)} saved to stock & cash ledgers.</span>
          </div>
          <span className="text-[11px] text-slate-400">Recorded by {user?.email}</span>
        </div>
      )}

      {/* Main Split Layout: Product Tiles vs Live Basket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Product Tiles (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                selectedCategoryId === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  selectedCategoryId === c.id
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const cat = categoryMap.get(prod.categoryId);
                const priceObj = getCurrentPrice(prod.id, channel, priceVersions);
                const deposit =
                  cat?.returnableContainer && channel === "outside"
                    ? getCurrentDeposit(cat.id, depositVersions)
                    : 0;

                const totalPrice = priceObj
                  ? priceObj.beerPrice + priceObj.addOn + deposit
                  : 0;

                const isLow = prod.stockOnHand <= prod.reorderPoint;

                return (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => handleProductTileClick(prod)}
                    className="w-full text-left flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 transition hover:border-emerald-500/60 hover:bg-slate-800/80 active:scale-95 cursor-pointer shadow-sm min-h-[105px]"
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {prod.brand}
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                        {prod.name}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {totalPrice > 0 ? formatMoney(totalPrice) : "—"}
                      </span>
                      <span
                        className={`font-mono text-[11px] ${
                          isLow ? "text-amber-400 font-semibold" : "text-slate-400"
                        }`}
                      >
                        {prod.stockOnHand} left
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Order Basket (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Customer Tally</h3>
              </div>
              {currentLines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentLines([])}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Basket Items List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] my-3 space-y-2 pr-1">
              {currentLines.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <Package className="mx-auto h-8 w-8 text-slate-700 mb-2" />
                  Tap any beverage tile to start adding items to this customer ticket.
                </div>
              ) : (
                currentLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-lg bg-slate-800/50 border border-slate-800 p-2.5 text-xs"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {line.productName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <span className="capitalize">{line.channel}</span> ·{" "}
                        <span className="font-mono text-emerald-400">
                          {formatMoney(line.unitPrice)}
                        </span>
                        {line.depositPortion > 0 && (
                          <span className="text-[10px] text-emerald-400 ml-1">
                            (+dep)
                          </span>
                        )}
                        {line.depositWaived && (
                          <span className="text-[10px] text-amber-400 ml-1">
                            (no dep)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qty +/- Controls */}
                    <div className="flex items-center gap-1.5 mr-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateLineQty(line.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-white">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLineQty(line.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-white">
                        {formatMoney(line.total)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Close Order Action */}
            <div className="border-t border-slate-800 pt-3 space-y-2 mt-auto">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Items:</span>
                <span className="font-mono font-semibold text-white">
                  {currentLines.reduce((acc, l) => acc + l.qty, 0)} units
                </span>
              </div>

              {basketTotals.totalDepositAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Bottle Deposits:</span>
                  <span className="font-mono text-emerald-400">
                    +{formatMoney(basketTotals.totalDepositAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-bold text-white border-t border-slate-800/80 pt-2">
                <span>Total Due:</span>
                <span className="font-mono text-lg text-emerald-400 font-bold">
                  {formatMoney(basketTotals.grandTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCloseOrderOpen(true)}
                disabled={currentLines.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 disabled:opacity-40 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Close Order ({formatMoney(basketTotals.grandTotal)})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Live Stream */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <History className="h-4 w-4 text-slate-400" />
          Recent Closed Orders Feed ({recentOrders.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Order ID</th>
                <th className="py-2.5 px-4">Items Summary</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4 text-right">Total Amount</th>
                <th className="py-2.5 px-4 text-right">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No orders closed yet today.
                  </td>
                </tr>
              ) : (
                recentOrders.slice(0, 15).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(ord.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-white">
                      #{ord.id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {ord.lines.map((l) => `${l.qty}x ${l.productName}`).join(", ")}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatMoney(ord.grandTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      {ord.cashierId.slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {effectiveClientId && (
        <>
          {addItemProduct && (
            <AddItemPopup
              isOpen={Boolean(addItemProduct)}
              onClose={() => setAddItemProduct(null)}
              product={addItemProduct}
              category={categoryMap.get(addItemProduct.categoryId)}
              channel={channel}
              priceVersions={priceVersions}
              depositVersions={depositVersions}
              depositOnNormalSales={true}
              depositOnTabSales={true}
              offers={offers}
              allowChangeMode={true}
              onConfirm={(line) => setCurrentLines((prev) => [...prev, line])}
            />
          )}

          <CloseOrderPopup
            isOpen={closeOrderOpen}
            onClose={() => setCloseOrderOpen(false)}
            clientId={effectiveClientId}
            lines={currentLines}
            customers={customers}
            availableTokens={availableTokens}
            depositOnNormalSales={true}
            depositOnTabSales={true}
            depositRate={
              currentLines[0]
                ? getCurrentDeposit(
                    products.find((p) => p.id === currentLines[0]?.productId)?.categoryId || "",
                    depositVersions,
                  )
                : 20000
            }
            userId={user?.uid || "cashier"}
            onOrderCompleted={handleOrderCompleted}
          />

          <BottleReturnModal
            isOpen={bottleReturnOpen}
            onClose={() => setBottleReturnOpen(false)}
            clientId={effectiveClientId}
            products={products}
            categories={categories}
            depositVersions={depositVersions}
            customers={customers}
            allMovements={allMovements}
            allReturns={allReturns}
            userId={user?.uid || "cashier"}
            businessDate={new Date().toISOString().slice(0, 10)}
          />

          <ManualSalesEntryModal
            isOpen={manualEntryOpen}
            onClose={() => setManualEntryOpen(false)}
            clientId={effectiveClientId}
            products={products}
            categories={categories}
            priceVersions={priceVersions}
            depositVersions={depositVersions}
            depositOnNormalSales={true}
            userId={user?.uid || "cashier"}
          />

          <AdminInboxModal
            isOpen={adminInboxOpen}
            onClose={() => setAdminInboxOpen(false)}
            clientId={effectiveClientId}
            requests={pendingRequests}
            adminId={user?.uid || "admin"}
          />
        </>
      )}
    </div>
  );
};
