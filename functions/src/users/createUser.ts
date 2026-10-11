import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth, db } from "../admin";

interface CreateUserData {
  clientId: string;
  email: string;
  password: string;
  displayName: string;
  role: "client_admin" | "cashier";
}

export const createUser = onCall<CreateUserData>(async (request) => {
  const callerRole = request.auth?.token?.role;
  const callerClientId = request.auth?.token?.clientId;

  const { clientId, email, password, displayName, role } = request.data;

  // Authorization check: Must be superadmin OR client_admin of the same client
  const isAuthorized =
    callerRole === "superadmin" ||
    (callerRole === "client_admin" && callerClientId === clientId);

  if (!isAuthorized) {
    throw new HttpsError("permission-denied", "You do not have permission to create users for this client.");
  }

  // Check user limit from entitlements
  const entSnap = await db.collection("clients").doc(clientId).collection("entitlements").doc("main").get();
  const maxUsers = entSnap.exists ? entSnap.data()?.maxUsers || 10 : 10;

  const currentUsersSnap = await db.collection("clients").doc(clientId).collection("users").get();
  if (currentUsersSnap.size >= maxUsers) {
    throw new HttpsError(
      "resource-exhausted",
      `User limit reached (${currentUsersSnap.size}/${maxUsers}). Please contact your system administrator to increase your user limit.`,
    );
  }

  // Create Firebase Auth user
  const newUser = await auth.createUser({
    email,
    password,
    displayName,
  });

  // Assign custom claims
  await auth.setCustomUserClaims(newUser.uid, {
    role,
    clientId,
  });

  // Save to client's users collection
  const now = new Date().toISOString();
  await db.collection("clients").doc(clientId).collection("users").doc(newUser.uid).set({
    id: newUser.uid,
    clientId,
    email,
    displayName,
    role,
    active: true,
    createdAt: now,
  });

  return { userId: newUser.uid };
});
