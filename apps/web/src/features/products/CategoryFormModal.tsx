import React, { useState, useEffect } from "react";
import type { Category } from "@/data/schemas/product.schema";
import { productsRepository } from "@/data/repositories/productsRepository";
import { X, Loader2, Plus, Trash2 } from "lucide-react";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  categories: Category[];
  onSaved?: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  clientId,
  categories,
  onSaved,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("bottle");
  const [returnableContainer, setReturnableContainer] = useState(false);
  const [channels, setChannels] = useState<string[]>(["inside", "outside"]);
  const [newChannel, setNewChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setUnit(editingCategory.unit);
      setReturnableContainer(editingCategory.returnableContainer);
      setChannels(editingCategory.channels);
    } else {
      setName("");
      setUnit("bottle");
      setReturnableContainer(false);
      setChannels(["inside", "outside"]);
    }
    setError(null);
  }, [editingCategory]);

  if (!isOpen) return null;

  const handleAddChannel = () => {
    const val = newChannel.trim().toLowerCase();
    if (val && !channels.includes(val)) {
      setChannels([...channels, val]);
      setNewChannel("");
    }
  };

  const handleRemoveChannel = (chan: string) => {
    if (channels.length <= 1) {
      setError("Category must have at least one sales channel.");
      return;
    }
    setChannels(channels.filter((c) => c !== chan));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || channels.length === 0) {
      setError("Please fill in category name, unit, and at least one channel.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await productsRepository.saveCategory(
        clientId,
        {
          name: name.trim(),
          unit: unit.trim(),
          returnableContainer,
          channels,
        },
        editingCategory?.id,
      );

      setEditingCategory(null);
      setName("");
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Manage Product Categories</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Existing Categories List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Existing Categories
            </h3>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setEditingCategory(c)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    editingCategory?.id === c.id
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-[11px] rounded bg-slate-700/60 px-2 py-0.5 text-slate-300">
                      Unit: {c.unit}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {c.returnableContainer ? (
                        <span className="text-emerald-400 font-medium">✓ Returnable bottle deposit</span>
                      ) : (
                        <span>Non-returnable</span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Channels: {c.channels.join(", ")}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {editingCategory && (
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-xs text-emerald-400 hover:underline pt-2 block"
              >
                + Add a new category instead
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-l border-slate-800 pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {editingCategory ? `Edit: ${editingCategory.name}` : "Create New Category"}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bottled Beer, Canned Beverages"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Unit of Measure *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. bottle, can, glass, keg"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catReturnable"
                checked={returnableContainer}
                onChange={(e) => setReturnableContainer(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="catReturnable" className="text-xs font-medium text-slate-300">
                Returnable Container (subject to deposit)
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Sales Channels</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channels.map((chan) => (
                  <span
                    key={chan}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-slate-200"
                  >
                    {chan}
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(chan)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="e.g. vip, delivery"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChannel();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
