import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin";

interface SetEntitlementsData {
  clientId: string;
  entitlements: Record<string, unknown>;
}

export const setEntitlements = onCall<SetEntitlementsData>(async (request) => {
  const isSuper = request.auth?.token?.role === "superadmin";
  if (!isSuper) {
    throw new HttpsError("permission-denied", "Only super administrators can modify entitlements.");
  }

  const { clientId, entitlements } = request.data;
  if (!clientId || !entitlements) {
    throw new HttpsError("invalid-argument", "clientId and entitlements are required.");
  }

  const now = new Date().toISOString();
  const entRef = db.collection("clients").doc(clientId).collection("entitlements").doc("main");

  // Read old value for audit logging
  const oldSnap = await entRef.get();
  const oldData = oldSnap.exists ? oldSnap.data() : null;

  await entRef.set(
    {
      ...entitlements,
      updatedAt: now,
      updatedBy: request.auth?.uid || "superadmin",
    },
    { merge: true },
  );

  // Write to super audit log
  await db.collection("superAuditLog").add({
    action: "set_entitlements",
    clientId,
    performedBy: request.auth?.uid || "superadmin",
    at: now,
    oldValue: oldData,
    newValue: entitlements,
  });
});
