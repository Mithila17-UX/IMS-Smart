import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth } from "../admin";

interface SetClaimsData {
  uid: string;
  role: "superadmin" | "client_admin" | "cashier";
  clientId?: string;
}

export const setClaims = onCall<SetClaimsData>(async (request) => {
  const isSuper = request.auth?.token?.role === "superadmin";
  if (!isSuper) {
    throw new HttpsError("permission-denied", "Only super administrators can set custom claims directly.");
  }

  const { uid, role, clientId } = request.data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid and role are required.");
  }

  await auth.setCustomUserClaims(uid, {
    role,
    ...(clientId ? { clientId } : {}),
  });

  return { success: true };
});
