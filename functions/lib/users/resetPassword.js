"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../admin");
exports.resetPassword = (0, https_1.onCall)(async (request) => {
    const callerRole = request.auth?.token?.role;
    const callerClientId = request.auth?.token?.clientId;
    const { clientId, userId, newPassword } = request.data;
    const isAuthorized = callerRole === "superadmin" ||
        (callerRole === "client_admin" && callerClientId === clientId);
    if (!isAuthorized) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized to reset password for this user.");
    }
    const user = await admin_1.auth.getUser(userId);
    if (newPassword) {
        await admin_1.auth.updateUser(userId, { password: newPassword });
        return { success: true };
    }
    else if (user.email) {
        const link = await admin_1.auth.generatePasswordResetLink(user.email);
        return { passwordResetLink: link };
    }
    else {
        throw new https_1.HttpsError("invalid-argument", "User does not have an email address.");
    }
});
//# sourceMappingURL=resetPassword.js.map