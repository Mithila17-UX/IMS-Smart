/**
 * Orders Repository.
 *
 * Handles live tally orders, atomic closure, single-tap sales,
 * and daily manual sales entries.
 *
 * All operations execute within atomic Firestore transactions.
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Order, OrderLineItem, PaymentSplitItem } from "@/data/schemas/order.schema";

function ordersCol(clientId: string) {
  return collection(db, "clients", clientId, "orders");
}

function productsCol(clientId: string) {
  return collection(db, "clients", clientId, "products");
}

function stockMovementsCol(clientId: string) {
  return collection(db, "clients", clientId, "stockMovements");
}

function cashEntriesCol(clientId: string) {
  return collection(db, "clients", clientId, "cashEntries");
}

function customersCol(clientId: string) {
  return collection(db, "clients", clientId, "customers");
}

function bottleReturnsCol(clientId: string) {
  return collection(db, "clients", clientId, "bottleReturns");
}

export const ordersRepository = {
  /**
   * Subscribe to recent closed orders for live tally feed.
   */
  subscribeOrders(
    clientId: string,
    onData: (orders: Order[]) => void,
    onError?: (err: Error) => void,
    maxItems = 50,
  ): Unsubscribe {
    const q = query(ordersCol(clientId), orderBy("createdAt", "desc"), limit(maxItems));
    return onSnapshot(
      q,
      (snap) => {
        const items: Order[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Order));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getRecentOrders(clientId: string, maxItems = 50): Promise<Order[]> {
    const q = query(ordersCol(clientId), orderBy("createdAt", "desc"), limit(maxItems));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  },

  /**
   * Atomically close an order:
   * 1. Creates `orders/{orderId}` document.
   * 2. For each line: creates `stockMovements` (type: "sale", qty: -qty) and updates `product.stockOnHand`.
   * 3. For cash payment (or cash split): creates `cashEntries` (type: "sale", amount: positive cash cents).
   * 4. For tab payment (or tab split): updates `customer.balance` and sets `oldestUnpaidDate` if needed.
   * 5. If bottle discount token used: updates `bottleReturns/{returnId}` marking token used.
   */
  async closeOrder(
    clientId: string,
    orderData: {
      lines: OrderLineItem[];
      totalBeerAmount: number;
      totalDepositAmount: number;
      totalDiscountAmount: number;
      bottleDiscountAmount: number;
      bottleDiscountTokenId?: string;
      grandTotal: number;
      paymentMethod: "cash" | "card" | "tab" | "split";
      splitPayments?: PaymentSplitItem[];
      customerId?: string;
      cashierId: string;
      notes?: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const orderRef = doc(ordersCol(clientId));
    const orderId = orderRef.id;

    await runTransaction(db, async (tx) => {
      // 1. Fetch products for all lines
      const productSnaps = await Promise.all(
        orderData.lines.map((l) => tx.get(doc(productsCol(clientId), l.productId))),
      );

      // 2. Fetch customer if tab sale
      let customerSnap = null;
      if (orderData.customerId) {
        customerSnap = await tx.get(doc(customersCol(clientId), orderData.customerId));
      }

      // 3. Fetch bottle return if discount token used
      let returnSnap = null;
      if (orderData.bottleDiscountTokenId) {
        returnSnap = await tx.get(doc(bottleReturnsCol(clientId), orderData.bottleDiscountTokenId));
      }

      // 4. Create Order document
      tx.set(orderRef, {
        id: orderId,
        status: "closed",
        lines: orderData.lines,
        totalBeerAmount: orderData.totalBeerAmount,
        totalDepositAmount: orderData.totalDepositAmount,
        totalDiscountAmount: orderData.totalDiscountAmount,
        bottleDiscountAmount: orderData.bottleDiscountAmount,
        bottleDiscountTokenId: orderData.bottleDiscountTokenId || null,
        grandTotal: orderData.grandTotal,
        paymentMethod: orderData.paymentMethod,
        splitPayments: orderData.splitPayments || null,
        customerId: orderData.customerId || null,
        cashierId: orderData.cashierId,
        createdAt: now,
        closedAt: now,
        notes: orderData.notes || "",
      });

      // 5. Append stockMovements and update product stockOnHand
      for (let i = 0; i < orderData.lines.length; i++) {
        const line = orderData.lines[i];
        if (!line) continue;
        const prodSnap = productSnaps[i];
        const prodData = prodSnap?.exists() ? prodSnap.data() : null;
        const currentStock = (prodData?.stockOnHand as number) || 0;
        const newStock = Math.max(0, currentStock - line.qty);

        const movementRef = doc(stockMovementsCol(clientId));
        tx.set(movementRef, {
          id: movementRef.id,
          productId: line.productId,
          type: "sale",
          qty: -line.qty, // sales are negative units
          channel: line.channel,
          unitPrice: line.unitPrice,
          depositPortion: line.depositPortion,
          depositWaived: line.depositWaived,
          paymentMethod: orderData.paymentMethod,
          orderId,
          offerId: line.offerId || null,
          cashierId: orderData.cashierId,
          at: now,
        });

        if (prodSnap?.exists()) {
          tx.update(doc(productsCol(clientId), line.productId), {
            stockOnHand: newStock,
            updatedAt: now,
          });
        }
      }

      // 6. Handle cash entry if cash was paid
      let cashAmount = 0;
      if (orderData.paymentMethod === "cash") {
        cashAmount = orderData.grandTotal;
      } else if (orderData.paymentMethod === "split" && orderData.splitPayments) {
        const cashSplit = orderData.splitPayments.find((s) => s.method === "cash");
        if (cashSplit) cashAmount = cashSplit.amount;
      }

      if (cashAmount > 0) {
        const cashRef = doc(cashEntriesCol(clientId));
        tx.set(cashRef, {
          id: cashRef.id,
          type: "sale",
          amount: cashAmount, // positive cash into drawer
          paymentMethod: "cash",
          orderId,
          recordedBy: orderData.cashierId,
          at: now,
        });
      }

      // 7. Handle customer tab balance update if tab was used
      let tabAmount = 0;
      if (orderData.paymentMethod === "tab") {
        tabAmount = orderData.grandTotal;
      } else if (orderData.paymentMethod === "split" && orderData.splitPayments) {
        const tabSplit = orderData.splitPayments.find((s) => s.method === "tab");
        if (tabSplit) tabAmount = tabSplit.amount;
      }

      if (tabAmount > 0 && orderData.customerId && customerSnap?.exists()) {
        const custData = customerSnap.data();
        const currentBalance = (custData?.balance as number) || 0;
        const oldestUnpaid = (custData?.oldestUnpaidDate as string) || now;

        tx.update(doc(customersCol(clientId), orderData.customerId), {
          balance: currentBalance + tabAmount,
          oldestUnpaidDate: oldestUnpaid,
          updatedAt: now,
        });
      }

      // 8. Mark bottle discount token as used if applied
      if (orderData.bottleDiscountTokenId && returnSnap?.exists()) {
        tx.update(doc(bottleReturnsCol(clientId), orderData.bottleDiscountTokenId), {
          "discountToken.usedInOrderId": orderId,
          "discountToken.usedAt": now,
        });
      }
    });

    return orderId;
  },

  /**
   * Daily Manual Sales Entry mode (used by clients on manual entry or as a fallback).
   * Records sales totals per product for a business day without itemized orders.
   */
  async recordDailyManualSales(
    clientId: string,
    data: {
      businessDate: string;
      cashierId: string;
      sales: Array<{
        productId: string;
        channel: string;
        qty: number;
        unitPrice: number;
        depositPortion: number;
        depositWaived: boolean;
      }>;
      totalCashReceived: number;
      notes?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      // For each product sale
      for (const item of data.sales) {
        if (item.qty <= 0) continue;

        const prodRef = doc(productsCol(clientId), item.productId);
        const prodSnap = await tx.get(prodRef);
        const currentStock = prodSnap.exists() ? (prodSnap.data()?.stockOnHand as number) || 0 : 0;

        const movRef = doc(stockMovementsCol(clientId));
        tx.set(movRef, {
          id: movRef.id,
          productId: item.productId,
          type: "sale",
          qty: -item.qty,
          channel: item.channel,
          unitPrice: item.unitPrice,
          depositPortion: item.depositPortion,
          depositWaived: item.depositWaived,
          paymentMethod: "cash",
          reason: `Daily manual entry (${data.businessDate})`,
          cashierId: data.cashierId,
          at: now,
        });

        if (prodSnap.exists()) {
          tx.update(prodRef, {
            stockOnHand: Math.max(0, currentStock - item.qty),
            updatedAt: now,
          });
        }
      }

      // Cash entry for the day's cash sales
      if (data.totalCashReceived > 0) {
        const cashRef = doc(cashEntriesCol(clientId));
        tx.set(cashRef, {
          id: cashRef.id,
          type: "sale",
          amount: data.totalCashReceived,
          paymentMethod: "cash",
          reason: `Daily manual entry (${data.businessDate})`,
          recordedBy: data.cashierId,
          at: now,
        });
      }
    });
  },
};
