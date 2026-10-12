/**
 * Cash Repository.
 *
 * Append-only cash drawer ledger (cashEntries) and expense categories.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { CashEntry, ExpenseCategory } from "@/data/schemas/cashEntry.schema";

function cashEntriesCol(clientId: string) {
  return collection(db, "clients", clientId, "cashEntries");
}

function expenseCategoriesCol(clientId: string) {
  return collection(db, "clients", clientId, "expenseCategories");
}

export const cashRepository = {
  subscribeCashEntries(
    clientId: string,
    onData: (entries: CashEntry[]) => void,
    onError?: (err: Error) => void,
    maxItems = 100,
  ): Unsubscribe {
    const q = query(cashEntriesCol(clientId), orderBy("at", "desc"), limit(maxItems));
    return onSnapshot(
      q,
      (snap) => {
        const items: CashEntry[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as CashEntry));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  subscribeExpenseCategories(
    clientId: string,
    onData: (categories: ExpenseCategory[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(expenseCategoriesCol(clientId), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: ExpenseCategory[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ExpenseCategory));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async saveExpenseCategory(
    clientId: string,
    category: Omit<ExpenseCategory, "id" | "createdAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(expenseCategoriesCol(clientId), existingId);
      await updateDoc(ref, { ...category });
      return existingId;
    }
    const ref = await addDoc(expenseCategoriesCol(clientId), {
      ...category,
      createdAt: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  /**
   * Log an operational bar expense paid from cash drawer.
   *
   * @param amount Positive integer cents paid. Stored as negative in cash drawer ledger.
   */
  async recordExpense(
    clientId: string,
    params: {
      amount: number; // positive cents
      categoryId: string;
      reason: string;
      recordedBy: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const ref = await addDoc(cashEntriesCol(clientId), {
      type: "expense",
      amount: -Math.abs(params.amount), // negative cash out
      paymentMethod: "cash",
      categoryId: params.categoryId,
      reason: params.reason,
      recordedBy: params.recordedBy,
      at: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  /**
   * Record float addition (float_in) or cash drop/withdrawal (float_out).
   */
  async recordFloatMovement(
    clientId: string,
    params: {
      type: "float_in" | "float_out";
      amount: number; // positive cents
      reason: string;
      recordedBy: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const signedAmount = params.type === "float_in" ? Math.abs(params.amount) : -Math.abs(params.amount);

    const ref = await addDoc(cashEntriesCol(clientId), {
      type: params.type,
      amount: signedAmount,
      paymentMethod: "cash",
      reason: params.reason,
      recordedBy: params.recordedBy,
      at: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },
};
