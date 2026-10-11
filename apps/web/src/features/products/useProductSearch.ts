import { useMemo } from "react";
import Fuse from "fuse.js";
import type { Product, Category } from "@/data/schemas/product.schema";

export interface SearchableProduct extends Product {
  categoryName: string;
}

export function useProductSearch(
  products: Product[],
  categories: Category[],
  searchTerm: string,
): SearchableProduct[] {
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const searchableItems = useMemo<SearchableProduct[]>(() => {
    return products.map((p) => ({
      ...p,
      categoryName: categoryMap.get(p.categoryId) || "",
    }));
  }, [products, categoryMap]);

  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: [
        { name: "brand", weight: 0.4 },
        { name: "name", weight: 0.4 },
        { name: "categoryName", weight: 0.2 },
      ],
      threshold: 0.35, // typo-tolerant matching
      ignoreLocation: true,
    });
  }, [searchableItems]);

  return useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return searchableItems;
    return fuse.search(trimmed).map((result) => result.item);
  }, [fuse, searchTerm, searchableItems]);
}
