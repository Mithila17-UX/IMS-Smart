/**
 * Customers Repository.
 *
 * Handles tab credit customers, repayments, and due date extensions.
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
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Customer, DueExtension } from "@/data/schemas/customer.schema";

function customersCol(clientId: string) {
  return collection(db, "clients", clientId, "customers");
}

function dueExtensionsCol(clientId: string) {
  return collection(db, "clients", clientId, "dueExtensions");
}

function cashEntriesCol(clientId: string) {
  return collection(db, "clients", clientId, "cashEntries");
}

export const customersRepository = {
  subscribeCustomers(
    clientId: string,
    onData: (customers: Customer[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(customersCol(clientId), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Customer[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Customer));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getCustomers(clientId: string): Promise<Customer[]> {
    const q = query(customersCol(clientId), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
  },

  async getCustomer(clientId: string, customerId: string): Promise<Customer | null> {
    const ref = doc(customersCol(clientId), customerId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Customer;
  },

  async saveCustomer(
    clientId: string,
    customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(customersCol(clientId), existingId);
      await updateDoc(ref, { ...customer, updatedAt: now });
      return existingId;
    }
    const ref = await addDoc(customersCol(clientId), {
      ...customer,
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  /**
   * Record a customer tab payment (repayment):
   * 1. Decreases customer balance.
   * 2. If balance reaches 0, clears oldestUnpaidDate.
   * 3. If paid in cash, appends a cashEntry (+amount) so expected cash increases.
   */
  async recordTabPayment(
    clientId: string,
    params: {
      customerId: string;
      amount: number; // in integer cents
      paymentMethod: "cash" | "card";
      recordedBy: string;
      notes?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const custRef = doc(customersCol(clientId), params.customerId);

    await runTransaction(db, async (tx) => {
      const custSnap = await tx.get(custRef);
      if (!custSnap.exists()) {
        throw new Error("Customer account not found.");
      }

      const custData = custSnap.data();
      const currentBalance = (custData?.balance as number) || 0;
      const newBalance = Math.max(0, currentBalance - params.amount);

      tx.update(custRef, {
        balance: newBalance,
        oldestUnpaidDate: newBalance === 0 ? null : custData?.oldestUnpaidDate,
        updatedAt: now,
      });

      // If cash payment received, enter into cash drawer ledger
      if (params.paymentMethod === "cash") {
        const cashRef = doc(cashEntriesCol(clientId));
        tx.set(cashRef, {
          id: cashRef.id,
          type: "tab_payment",
          amount: params.amount, // positive cash in
          paymentMethod: "cash",
          customerId: params.customerId,
          reason: params.notes || `Tab payment by ${custData?.name}`,
          recordedBy: params.recordedBy,
          at: now,
        });
      }
    });
  },

  /**
   * Admin extends a customer's tab due date with a reason note.
   */
  async extendDueDate(
    clientId: string,
    params: {
      customerId: string;
      newDueDate: string; // YYYY-MM-DD
      reason: string;
      changedBy: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const extRef = await addDoc(dueExtensionsCol(clientId), {
      customerId: params.customerId,
      newDueDate: params.newDueDate,
      reason: params.reason,
      changedBy: params.changedBy,
      at: now,
    });
    await updateDoc(extRef, { id: extRef.id });

    // Update customer's updatedAt
    await updateDoc(doc(customersCol(clientId), params.customerId), {
      updatedAt: now,
    });

    return extRef.id;
  },

  /**
   * Subscribe to due date extensions for a client.
   */
  subscribeDueExtensions(
    clientId: string,
    onData: (extensions: DueExtension[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(dueExtensionsCol(clientId), orderBy("at", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: DueExtension[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as DueExtension));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
};
