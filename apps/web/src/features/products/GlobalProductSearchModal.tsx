import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { productsRepository } from "@/data/repositories/productsRepository";
import type { Product, Category, PriceVersion } from "@/data/schemas/product.schema";
import { getCurrentPrice } from "@/domain/prices";
import { formatMoney } from "@/lib/money";
import { useProductSearch } from "./useProductSearch";
import { Search, X, Package } from "lucide-react";

interface GlobalProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalProductSearchModal: React.FC<GlobalProductSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { effectiveClientId } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceVersions, setPriceVersions] = useState<PriceVersion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen || !effectiveClientId) return;

    const unsubProds = productsRepository.subscribeProducts(
      effectiveClientId,
      (p) => setProducts(p),
    );
    const unsubCats = productsRepository.subscribeCategories(
      effectiveClientId,
      (c) => setCategories(c),
    );
    const unsubPrices = productsRepository.subscribePriceVersions(
      effectiveClientId,
      (pv) => setPriceVersions(pv),
    );

    return () => {
      unsubProds();
      unsubCats();
      unsubPrices();
    };
  }, [isOpen, effectiveClientId]);

  const searchResults = useProductSearch(products, categories, searchTerm);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-800 p-4 flex items-center gap-3">
          <Search className="h-5 w-5 text-emerald-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by brand or name (e.g. Lion, Heineken)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No products found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            searchResults.map((prod) => {
              const inside = getCurrentPrice(prod.id, "inside", priceVersions);

              return (
                <button
                  type="button"
                  key={prod.id}
                  onClick={() => {
                    onClose();
                    navigate("/products");
                  }}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/60 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{prod.name}</div>
                      <div className="text-xs text-slate-400">
                        Brand: <span className="text-slate-300">{prod.brand}</span> · Category:{" "}
                        <span className="text-slate-300">{prod.categoryName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-semibold text-white">
                      {inside ? formatMoney(inside.beerPrice) : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Stock: <span className="font-mono text-emerald-400">{prod.stockOnHand}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Typo-tolerant search powered by Fuse.js</span>
          <span>Click product to view in Catalogue</span>
        </div>
      </div>
    </div>
  );
};
