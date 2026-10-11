import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { productsRepository } from "@/data/repositories/productsRepository";
import type { Product, Category, PriceVersion, DepositVersion } from "@/data/schemas/product.schema";
import { getCurrentPrice, getCurrentDeposit } from "@/domain/prices";
import { formatMoney } from "@/lib/money";
import { useProductSearch } from "./useProductSearch";
import { ProductFormModal } from "./ProductFormModal";
import { CategoryFormModal } from "./CategoryFormModal";
import { PriceVersionModal } from "./PriceVersionModal";
import { DepositVersionModal } from "./DepositVersionModal";
import {
  Package,
  Plus,
  Layers,
  Search,
  Tag,
  AlertCircle,
  Edit2,
} from "lucide-react";

export const ProductsPage: React.FC = () => {
  const { effectiveClientId, user, role } = useAuth();
  const isAdmin = role === "client_admin" || role === "superadmin";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceVersions, setPriceVersions] = useState<PriceVersion[]>([]);
  const [depositVersions, setDepositVersions] = useState<DepositVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositModalCategory, setDepositModalCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!effectiveClientId) return;

    setLoading(true);

    const unsubCats = productsRepository.subscribeCategories(
      effectiveClientId,
      (cats) => setCategories(cats),
      (err) => console.error("Categories error:", err),
    );

    const unsubProds = productsRepository.subscribeAllProducts(
      effectiveClientId,
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        console.error("Products error:", err);
        setLoading(false);
      },
    );

    const unsubPrices = productsRepository.subscribePriceVersions(
      effectiveClientId,
      (pvs) => setPriceVersions(pvs),
      (err) => console.error("Prices error:", err),
    );

    const unsubDeposits = productsRepository.subscribeDepositVersions(
      effectiveClientId,
      (dvs) => setDepositVersions(dvs),
      (err) => console.error("Deposits error:", err),
    );

    return () => {
      unsubCats();
      unsubProds();
      unsubPrices();
      unsubDeposits();
    };
  }, [effectiveClientId]);

  // Filter by category
  const filteredByCategory = selectedCategoryId === "all"
    ? products
    : products.filter((p) => p.categoryId === selectedCategoryId);

  // Search with Fuse.js
  const searchedProducts = useProductSearch(filteredByCategory, categories, searchQuery);

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-emerald-400" />
            Products & Catalogue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage beverage brands, category classifications, versioned channel pricing, and bottle deposits.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              <Layers className="h-4 w-4 text-slate-400" />
              Categories & Deposits
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategoryId("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategoryId === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategoryId === c.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, name (Fuse.js)..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-9 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Brand & Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Inside Price</th>
                <th className="py-3 px-4">Outside Price (Takeaway)</th>
                <th className="py-3 px-4">Avg Cost (WAC)</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading catalogue...
                  </td>
                </tr>
              ) : searchedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No products found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                searchedProducts.map((p) => {
                  const cat = categoryMap.get(p.categoryId);
                  const insidePrice = getCurrentPrice(p.id, "inside", priceVersions);
                  const outsidePrice = getCurrentPrice(p.id, "outside", priceVersions);
                  const depositAmount = cat?.returnableContainer
                    ? getCurrentDeposit(cat.id, depositVersions)
                    : 0;

                  const isLowStock = p.stockOnHand <= p.reorderPoint;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-semibold text-white block">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Brand: <strong className="text-slate-300">{p.brand}</strong>
                            </span>
                          </div>
                          {!p.active && (
                            <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 text-[10px] text-rose-400">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-medium">
                            {cat?.name || "Uncategorized"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Unit: {cat?.unit || "unit"}
                            {cat?.returnableContainer && (
                              <span className="text-emerald-400 ml-1">· Returnable</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Inside Price */}
                      <td className="py-3.5 px-4 font-mono">
                        {insidePrice ? (
                          <span className="font-semibold text-white">
                            {formatMoney(insidePrice.beerPrice)}
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[11px] italic">Not set</span>
                        )}
                      </td>

                      {/* Outside Price */}
                      <td className="py-3.5 px-4 font-mono">
                        {outsidePrice ? (
                          <div>
                            <span className="font-semibold text-white">
                              {formatMoney(outsidePrice.beerPrice + outsidePrice.addOn + depositAmount)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {formatMoney(outsidePrice.beerPrice)}
                              {outsidePrice.addOn > 0 && ` + ${formatMoney(outsidePrice.addOn)} add-on`}
                              {depositAmount > 0 && ` + ${formatMoney(depositAmount)} dep`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-400 text-[11px] italic">Not set</span>
                        )}
                      </td>

                      {/* Average Cost (WAC) */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {p.avgCost > 0 ? (
                          formatMoney(p.avgCost)
                        ) : (
                          <span className="text-slate-500 italic">No purchase</span>
                        )}
                      </td>

                      {/* Stock on Hand */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-semibold ${
                              isLowStock ? "text-amber-400" : "text-white"
                            }`}
                          >
                            {p.stockOnHand} {cat?.unit || ""}
                          </span>
                          {isLowStock && (
                            <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                              <AlertCircle className="h-3 w-3" />
                              Low (&le;{p.reorderPoint})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setPriceModalProduct(p);
                                  setPriceModalOpen(true);
                                }}
                                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
                                title="Set / View Price History"
                              >
                                <Tag className="h-3.5 w-3.5 text-emerald-400" />
                                Prices
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductModalOpen(true);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                                title="Edit Product"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </>
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

      {/* Modals */}
      {effectiveClientId && (
        <>
          <ProductFormModal
            isOpen={productModalOpen}
            onClose={() => setProductModalOpen(false)}
            clientId={effectiveClientId}
            categories={categories}
            productToEdit={editingProduct}
          />

          <CategoryFormModal
            isOpen={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            clientId={effectiveClientId}
            categories={categories}
          />

          {priceModalProduct && (
            <PriceVersionModal
              isOpen={priceModalOpen}
              onClose={() => {
                setPriceModalOpen(false);
                setPriceModalProduct(null);
              }}
              clientId={effectiveClientId}
              product={priceModalProduct}
              priceVersions={priceVersions}
              channels={
                categoryMap.get(priceModalProduct.categoryId)?.channels || ["inside", "outside"]
              }
              userId={user?.uid || "admin"}
            />
          )}

          {depositModalCategory && (
            <DepositVersionModal
              isOpen={depositModalOpen}
              onClose={() => {
                setDepositModalOpen(false);
                setDepositModalCategory(null);
              }}
              clientId={effectiveClientId}
              category={depositModalCategory}
              depositVersions={depositVersions}
              userId={user?.uid || "admin"}
            />
          )}
        </>
      )}
    </div>
  );
};
