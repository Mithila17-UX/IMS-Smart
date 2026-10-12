/**
 * Approval Requests Repository.
 *
 * Real-time queue for cashier-sent requests (over-limit tabs, manual discounts,
 * complimentary drinks, staff drinks) that await admin approval.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { ApprovalRequest, ApprovalKind } from "@/data/schemas/approvalRequest.schema";

function approvalRequestsCol(clientId: string) {
  return collection(db, "clients", clientId, "approvalRequests");
}

export const approvalRequestsRepository = {
  /**
   * Subscribe to pending requests awaiting admin review.
   */
  subscribePendingRequests(
    clientId: string,
    onData: (requests: ApprovalRequest[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(
      approvalRequestsCol(clientId),
      where("status", "==", "pending"),
      orderBy("at", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const items: ApprovalRequest[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ApprovalRequest));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  subscribeAllRequests(
    clientId: string,
    onData: (requests: ApprovalRequest[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(approvalRequestsCol(clientId), orderBy("at", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: ApprovalRequest[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ApprovalRequest));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  /**
   * Cashier creates an approval request.
   */
  async createRequest(
    clientId: string,
    params: {
      kind: ApprovalKind;
      requestedBy: string;
      details: ApprovalRequest["details"];
    },
  ): Promise<string> {
    const now = new Date().toISOString();
    const ref = await addDoc(approvalRequestsCol(clientId), {
      kind: params.kind,
      status: "pending",
      requestedBy: params.requestedBy,
      details: params.details,
      at: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  /**
   * Admin approves or rejects a request.
   */
  async decideRequest(
    clientId: string,
    params: {
      requestId: string;
      status: "approved" | "rejected";
      decidedBy: string;
      rejectionReason?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const ref = doc(approvalRequestsCol(clientId), params.requestId);
    await updateDoc(ref, {
      status: params.status,
      decidedBy: params.decidedBy,
      decidedAt: now,
      rejectionReason: params.rejectionReason || null,
    });
  },
};
