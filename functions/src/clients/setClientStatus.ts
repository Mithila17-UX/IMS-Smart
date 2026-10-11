import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin";

interface SetClientStatusData {
  clientId: string;
  status: "active" | "read_only" | "blocked";
  reason?: string;
}

export const setClientStatus = onCall<SetClientStatusData>(async (request) => {
  const isSuper = request.auth?.token?.role === "superadmin";
  if (!isSuper) {
    throw new HttpsError("permission-denied", "Only super administrators can change client status.");
  }

  const { clientId, status, reason } = request.data;
  if (!clientId || !["active", "read_only", "blocked"].includes(status)) {
    throw new HttpsError("invalid-argument", "Valid clientId and status are required.");
  }

  const now = new Date().toISOString();
  const clientRef = db.collection("clients").doc(clientId);
  const entRef = clientRef.collection("entitlements").doc("main");

  const oldClientSnap = await clientRef.get();
  const oldStatus = oldClientSnap.exists ? oldClientSnap.data()?.status : null;

  const updates = {
    status,
    statusReason: reason || null,
    updatedAt: now,
  };

  await clientRef.update(updates);
  await entRef.update({
    status,
    statusReason: reason || null,
    updatedAt: now,
    updatedBy: request.auth?.uid || "superadmin",
  });

  // Record status change in audit log
  await db.collection("superAuditLog").add({
    action: "change_client_status",
    clientId,
    performedBy: request.auth?.uid || "superadmin",
    at: now,
    oldStatus,
    newStatus: status,
    reason: reason || null,
  });
});
