"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEntitlements = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../admin");
exports.setEntitlements = (0, https_1.onCall)(async (request) => {
    const isSuper = request.auth?.token?.role === "superadmin";
    if (!isSuper) {
        throw new https_1.HttpsError("permission-denied", "Only super administrators can modify entitlements.");
    }
    const { clientId, entitlements } = request.data;
    if (!clientId || !entitlements) {
        throw new https_1.HttpsError("invalid-argument", "clientId and entitlements are required.");
    }
    const now = new Date().toISOString();
    const entRef = admin_1.db.collection("clients").doc(clientId).collection("entitlements").doc("main");
    // Read old value for audit logging
    const oldSnap = await entRef.get();
    const oldData = oldSnap.exists ? oldSnap.data() : null;
    await entRef.set({
        ...entitlements,
        updatedAt: now,
        updatedBy: request.auth?.uid || "superadmin",
    }, { merge: true });
    // Write to super audit log
    await admin_1.db.collection("superAuditLog").add({
        action: "set_entitlements",
        clientId,
        performedBy: request.auth?.uid || "superadmin",
        at: now,
        oldValue: oldData,
        newValue: entitlements,
    });
});
//# sourceMappingURL=setEntitlements.js.map