/**
 * Suppliers Repository
 *
 * Real-time subscriptions and CRUD operations for suppliers.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Supplier } from "@/data/schemas/supplier.schema";

function suppliersCol(clientId: string) {
  return collection(db, "clients", clientId, "suppliers");
}

export const suppliersRepository = {
  subscribeSuppliers(
    clientId: string,
    onData: (suppliers: Supplier[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(suppliersCol(clientId), where("active", "==", true), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Supplier[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Supplier));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  subscribeAllSuppliers(
    clientId: string,
    onData: (suppliers: Supplier[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(suppliersCol(clientId), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Supplier[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Supplier));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getSuppliers(clientId: string): Promise<Supplier[]> {
    const q = query(suppliersCol(clientId), where("active", "==", true), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier));
  },

  async getSupplier(clientId: string, supplierId: string): Promise<Supplier | null> {
    const ref = doc(suppliersCol(clientId), supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Supplier;
  },

  async saveSupplier(
    clientId: string,
    supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(suppliersCol(clientId), existingId);
      await updateDoc(ref, { ...supplier, updatedAt: now });
      return existingId;
    }
    const ref = await addDoc(suppliersCol(clientId), {
      ...supplier,
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },
};
