/**
 * Bottle Returns Repository.
 *
 * Handles customer empty bottle returns, deposit cash refunds,
 * and discount token lifecycle.
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { BottleReturn, DiscountToken } from "@/data/schemas/bottleReturn.schema";
import { buildDiscountToken } from "@/domain/returns";

function bottleReturnsCol(clientId: string) {
  return collection(db, "clients", clientId, "bottleReturns");
}

function cashEntriesCol(clientId: string) {
  return collection(db, "clients", clientId, "cashEntries");
}

export const bottleReturnsRepository = {
  subscribeBottleReturns(
    clientId: string,
    onData: (returns: BottleReturn[]) => void,
    onError?: (err: Error) => void,
    maxItems = 50,
  ): Unsubscribe {
    const q = query(bottleReturnsCol(clientId), orderBy("at", "desc"), limit(maxItems));
    return onSnapshot(
      q,
      (snap) => {
        const items: BottleReturn[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as BottleReturn));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getAllBottleReturns(clientId: string): Promise<BottleReturn[]> {
    const q = query(bottleReturnsCol(clientId), orderBy("at", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BottleReturn));
  },

  /**
   * Subscribe to unused returned-bottle discount tokens available to apply to orders today.
   */
  subscribeAvailableDiscountTokens(
    clientId: string,
    onData: (tokens: Array<{ returnId: string; token: DiscountToken }>) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(
      bottleReturnsCol(clientId),
      where("settlement", "==", "discount"),
      where("discountToken.usedInOrderId", "==", null),
    );
    return onSnapshot(
      q,
      (snap) => {
        const tokens: Array<{ returnId: string; token: DiscountToken }> = [];
        snap.forEach((d) => {
          const data = d.data() as BottleReturn;
          if (data.discountToken && !data.discountToken.usedInOrderId) {
            tokens.push({ returnId: d.id, token: data.discountToken });
          }
        });
        onData(tokens);
      },
      (err) => onError?.(err),
    );
  },

  /**
   * Atomically record a bottle return:
   * 1. Creates `bottleReturns/{id}` document.
   * 2. If settlement is "cash", creates `cashEntries` (type: "deposit_refund", negative cash out).
   * 3. If settlement is "discount", attaches single-use discount token.
   */
  async recordBottleReturn(
    clientId: string,
    data: {
      productId: string;
      qty: number;
      depositAmount: number; // per bottle
      totalRefund: number;
      settlement: "cash" | "discount";
      customerId?: string;
      cashierId: string;
      businessDate: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const returnRef = doc(bottleReturnsCol(clientId));
    const returnId = returnRef.id;

    // eslint-disable-next-line @typescript-eslint/require-await
    await runTransaction(db, async (tx) => {
      let discountToken: DiscountToken | undefined = undefined;

      if (data.settlement === "discount") {
        discountToken = buildDiscountToken(returnId, data.totalRefund, data.businessDate);
      }

      // 1. Create return document
      tx.set(returnRef, {
        id: returnId,
        productId: data.productId,
        qty: data.qty,
        depositAmount: data.depositAmount,
        totalRefund: data.totalRefund,
        settlement: data.settlement,
        discountToken: discountToken || null,
        customerId: data.customerId || null,
        cashierId: data.cashierId,
        at: now,
      });

      // 2. If cash settlement, record cash refund out of drawer
      if (data.settlement === "cash") {
        const cashRef = doc(cashEntriesCol(clientId));
        tx.set(cashRef, {
          id: cashRef.id,
          type: "deposit_refund",
          amount: -data.totalRefund, // negative cash OUT
          paymentMethod: "cash",
          returnId,
          customerId: data.customerId || null,
          reason: `Bottle deposit cash refund (${data.qty} bottles)`,
          recordedBy: data.cashierId,
          at: now,
        });
      }
    });

    return returnId;
  },
};
