/**
 * Stock Repository
 *
 * Handles purchases, stock movements, and atomic inventory updates.
 *
 * Principles:
 * - stockMovements is an append-only immutable ledger.
 * - purchases is an append-only delivery record.
 * - Product stockOnHand and avgCost (WAC) are updated atomically in a transaction.
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
import type { Purchase, PurchaseLineItem } from "@/data/schemas/supplier.schema";
import type { StockMovement, StockMovementType } from "@/data/schemas/stockMovement.schema";
import { calcNewWAC } from "@/domain/stock";

function purchasesCol(clientId: string) {
  return collection(db, "clients", clientId, "purchases");
}

function stockMovementsCol(clientId: string) {
  return collection(db, "clients", clientId, "stockMovements");
}

function productsCol(clientId: string) {
  return collection(db, "clients", clientId, "products");
}

export const stockRepository = {
  /**
   * Subscribe to recent stock movements across all products.
   */
  subscribeStockMovements(
    clientId: string,
    onData: (movements: StockMovement[]) => void,
    onError?: (err: Error) => void,
    maxItems = 100,
  ): Unsubscribe {
    const q = query(stockMovementsCol(clientId), orderBy("at", "desc"), limit(maxItems));
    return onSnapshot(
      q,
      (snap) => {
        const items: StockMovement[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as StockMovement));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  /**
   * Subscribe to deliveries (purchases).
   */
  subscribePurchases(
    clientId: string,
    onData: (purchases: Purchase[]) => void,
    onError?: (err: Error) => void,
    maxItems = 50,
  ): Unsubscribe {
    const q = query(purchasesCol(clientId), orderBy("deliveredOn", "desc"), limit(maxItems));
    return onSnapshot(
      q,
      (snap) => {
        const items: Purchase[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Purchase));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  /**
   * Atomically record a supplier purchase delivery:
   * 1. Creates `purchases/{purchaseId}` doc.
   * 2. Creates one `stockMovements` doc per line item.
   * 3. Reads each product and updates `stockOnHand` and `avgCost` (WAC).
   */
  async recordPurchase(
    clientId: string,
    data: {
      supplierId: string;
      deliveredOn: string;
      reference?: string;
      notes?: string;
      lines: PurchaseLineItem[];
      recordedBy: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const purchaseRef = doc(purchasesCol(clientId));
    const purchaseId = purchaseRef.id;

    await runTransaction(db, async (tx) => {
      // 1. Fetch current product states for all lines
      const productDocs = await Promise.all(
        data.lines.map((line) => tx.get(doc(productsCol(clientId), line.productId))),
      );

      // 2. Set purchase doc
      tx.set(purchaseRef, {
        id: purchaseId,
        supplierId: data.supplierId,
        deliveredOn: data.deliveredOn,
        reference: data.reference || "",
        notes: data.notes || "",
        lines: data.lines,
        recordedBy: data.recordedBy,
        createdAt: now,
      });

      // 3. For each line, add stockMovement & update product WAC and stockOnHand
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        if (!line) continue;
        const prodSnap = productDocs[i];
        const prodData = prodSnap?.exists() ? prodSnap.data() : null;

        const currentStock = (prodData?.stockOnHand as number) || 0;
        const currentAvgCost = (prodData?.avgCost as number) || 0;

        const newAvgCost = calcNewWAC(currentStock, currentAvgCost, line.qty, line.unitCost);
        const newStockOnHand = currentStock + line.qty;

        // Stock movement doc
        const movementRef = doc(stockMovementsCol(clientId));
        tx.set(movementRef, {
          id: movementRef.id,
          productId: line.productId,
          type: "purchase",
          qty: line.qty, // positive in
          unitPrice: line.unitCost,
          purchaseId,
          cashierId: data.recordedBy,
          at: now,
        });

        // Update product cache
        if (prodSnap && prodSnap.exists()) {
          tx.update(doc(productsCol(clientId), line.productId), {
            stockOnHand: newStockOnHand,
            avgCost: newAvgCost,
            updatedAt: now,
          });
        }
      }
    });

    return purchaseId;
  },

  /**
   * Atomically record a manual stock adjustment or wastage:
   * 1. Creates `stockMovements` doc with negative/positive qty.
   * 2. Updates product `stockOnHand`.
   */
  async recordStockAdjustment(
    clientId: string,
    params: {
      productId: string;
      type: StockMovementType;
      qty: number; // positive or negative
      reason: string;
      cashierId: string;
      approvedBy?: string;
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const prodRef = doc(productsCol(clientId), params.productId);
    const movementRef = doc(stockMovementsCol(clientId));

    await runTransaction(db, async (tx) => {
      const prodSnap = await tx.get(prodRef);
      if (!prodSnap.exists()) {
        throw new Error(`Product ${params.productId} not found.`);
      }

      const prodData = prodSnap.data();
      const currentStock = (prodData?.stockOnHand as number) || 0;
      const newStockOnHand = currentStock + params.qty;

      tx.set(movementRef, {
        id: movementRef.id,
        productId: params.productId,
        type: params.type,
        qty: params.qty,
        reason: params.reason,
        cashierId: params.cashierId,
        approvedBy: params.approvedBy || "",
        at: now,
      });

      tx.update(prodRef, {
        stockOnHand: newStockOnHand,
        updatedAt: now,
      });
    });

    return movementRef.id;
  },

  /**
   * Fetch all movements for a single product (used for replay and auditing).
   */
  async getMovementsForProduct(clientId: string, productId: string): Promise<StockMovement[]> {
    const q = query(stockMovementsCol(clientId), orderBy("at", "asc"));
    const snap = await getDocs(q);
    const items: StockMovement[] = [];
    snap.forEach((d) => {
      const data = d.data() as StockMovement;
      if (data.productId === productId) {
        items.push(data);
      }
    });
    return items;
  },
};
