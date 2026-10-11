/**
 * Products Repository
 *
 * Handles all reads for products, categories, priceVersions and depositVersions.
 * Write operations (create / update) go through Cloud Functions to keep
 * permission enforcement server-side.
 *
 * Pattern:
 *   subscribeXxx() → Firestore onSnapshot; returns Unsubscribe
 *   getXxx()       → one-shot getDocs / getDoc
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Category, Product, PriceVersion, DepositVersion } from "@/data/schemas/product.schema";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function categoryPath(clientId: string) {
  return collection(db, "clients", clientId, "categories");
}

function productPath(clientId: string) {
  return collection(db, "clients", clientId, "products");
}

function priceVersionPath(clientId: string) {
  return collection(db, "clients", clientId, "priceVersions");
}

function depositVersionPath(clientId: string) {
  return collection(db, "clients", clientId, "depositVersions");
}

// ──────────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────────

export const productsRepository = {
  subscribeCategories(
    clientId: string,
    onData: (categories: Category[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(categoryPath(clientId), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Category[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getCategories(clientId: string): Promise<Category[]> {
    const q = query(categoryPath(clientId), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  },

  async saveCategory(
    clientId: string,
    category: Omit<Category, "id" | "createdAt" | "updatedAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(categoryPath(clientId), existingId);
      await updateDoc(ref, { ...category, updatedAt: now });
      return existingId;
    }
    const ref = await addDoc(categoryPath(clientId), {
      ...category,
      createdAt: now,
      updatedAt: now,
    });
    // Write the id field back so the document is self-describing
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Products
  // ──────────────────────────────────────────────────────────────────────────

  subscribeProducts(
    clientId: string,
    onData: (products: Product[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(productPath(clientId), where("active", "==", true), orderBy("brand", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Product[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Product));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  /** Subscribe to ALL products (including inactive) — for admin pages. */
  subscribeAllProducts(
    clientId: string,
    onData: (products: Product[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(productPath(clientId), orderBy("brand", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Product[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Product));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getProduct(clientId: string, productId: string): Promise<Product | null> {
    const ref = doc(productPath(clientId), productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
  },

  async saveProduct(
    clientId: string,
    product: Omit<Product, "id" | "createdAt" | "updatedAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(productPath(clientId), existingId);
      await updateDoc(ref, { ...product, updatedAt: now });
      return existingId;
    }
    const ref = doc(productPath(clientId));
    await setDoc(ref, { id: ref.id, ...product, createdAt: now, updatedAt: now });
    return ref.id;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Price Versions (append-only)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to all price versions for a client.
   * The UI resolves the effective price using domain/prices.ts (getPriceAt).
   */
  subscribePriceVersions(
    clientId: string,
    onData: (versions: PriceVersion[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(priceVersionPath(clientId), orderBy("effectiveFrom", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: PriceVersion[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as PriceVersion));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getPriceVersions(clientId: string): Promise<PriceVersion[]> {
    const q = query(priceVersionPath(clientId), orderBy("effectiveFrom", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceVersion));
  },

  /**
   * Append a new price version. NEVER updates an existing document.
   */
  async addPriceVersion(
    clientId: string,
    version: Omit<PriceVersion, "id">,
  ): Promise<string> {
    const ref = await addDoc(priceVersionPath(clientId), {
      ...version,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Deposit Versions (append-only)
  // ──────────────────────────────────────────────────────────────────────────

  subscribeDepositVersions(
    clientId: string,
    onData: (versions: DepositVersion[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(depositVersionPath(clientId), orderBy("effectiveFrom", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: DepositVersion[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as DepositVersion));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getDepositVersions(clientId: string): Promise<DepositVersion[]> {
    const q = query(depositVersionPath(clientId), orderBy("effectiveFrom", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositVersion));
  },

  /**
   * Append a new deposit version. NEVER updates an existing document.
   */
  async addDepositVersion(
    clientId: string,
    version: Omit<DepositVersion, "id">,
  ): Promise<string> {
    const ref = await addDoc(depositVersionPath(clientId), {
      ...version,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
};
