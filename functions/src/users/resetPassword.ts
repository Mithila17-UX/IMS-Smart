import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth } from "../admin";

interface ResetPasswordData {
  clientId: string;
  userId: string;
  newPassword?: string;
}

export const resetPassword = onCall<ResetPasswordData>(async (request) => {
  const callerRole = request.auth?.token?.role;
  const callerClientId = request.auth?.token?.clientId;

  const { clientId, userId, newPassword } = request.data;

  const isAuthorized =
    callerRole === "superadmin" ||
    (callerRole === "client_admin" && callerClientId === clientId);

  if (!isAuthorized) {
    throw new HttpsError("permission-denied", "Unauthorized to reset password for this user.");
  }

  const user = await auth.getUser(userId);

  if (newPassword) {
    await auth.updateUser(userId, { password: newPassword });
    return { success: true };
  } else if (user.email) {
    const link = await auth.generatePasswordResetLink(user.email);
    return { passwordResetLink: link };
  } else {
    throw new HttpsError("invalid-argument", "User does not have an email address.");
  }
});
