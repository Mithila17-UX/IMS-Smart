"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setClaims = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../admin");
exports.setClaims = (0, https_1.onCall)(async (request) => {
    const isSuper = request.auth?.token?.role === "superadmin";
    if (!isSuper) {
        throw new https_1.HttpsError("permission-denied", "Only super administrators can set custom claims directly.");
    }
    const { uid, role, clientId } = request.data;
    if (!uid || !role) {
        throw new https_1.HttpsError("invalid-argument", "uid and role are required.");
    }
    await admin_1.auth.setCustomUserClaims(uid, {
        role,
        ...(clientId ? { clientId } : {}),
    });
    return { success: true };
});
//# sourceMappingURL=setClaims.js.map