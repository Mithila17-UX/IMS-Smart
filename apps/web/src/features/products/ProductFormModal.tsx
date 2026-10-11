import React, { useState, useEffect } from "react";
import type { Product, Category } from "@/data/schemas/product.schema";
import { productsRepository } from "@/data/repositories/productsRepository";
import { X, Loader2 } from "lucide-react";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  categories: Category[];
  productToEdit?: Product | null;
  onSaved?: (productId: string) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  clientId,
  categories,
  productToEdit,
  onSaved,
}) => {
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reorderPoint, setReorderPoint] = useState(24);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setBrand(productToEdit.brand);
      setName(productToEdit.name);
      setCategoryId(productToEdit.categoryId);
      setReorderPoint(productToEdit.reorderPoint);
      setActive(productToEdit.active);
    } else {
      setBrand("");
      setName("");
      setCategoryId(categories[0]?.id || "");
      setReorderPoint(24);
      setActive(true);
    }
    setError(null);
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !name.trim() || !categoryId) {
      setError("Please fill in brand, product name, and select a category.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const productId = await productsRepository.saveProduct(
        clientId,
        {
          brand: brand.trim(),
          name: name.trim(),
          categoryId,
          reorderPoint: Math.max(0, Number(reorderPoint) || 0),
          stockOnHand: productToEdit ? productToEdit.stockOnHand : 0,
          avgCost: productToEdit ? productToEdit.avgCost : 0,
          active,
        },
        productToEdit?.id,
      );

      onSaved?.(productId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">
            {productToEdit ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Brand *</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Lion, Carlsberg, Heineken"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lion Lager 625ml"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Reorder Point (Minimum Units)
            </label>
            <input
              type="number"
              min="0"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Triggers a low-stock alert when stock on hand falls to or below this count.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="productActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="productActive" className="text-xs font-medium text-slate-300">
              Active (visible in sales tally and catalog)
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {productToEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
