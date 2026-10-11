"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setClientStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../admin");
exports.setClientStatus = (0, https_1.onCall)(async (request) => {
    const isSuper = request.auth?.token?.role === "superadmin";
    if (!isSuper) {
        throw new https_1.HttpsError("permission-denied", "Only super administrators can change client status.");
    }
    const { clientId, status, reason } = request.data;
    if (!clientId || !["active", "read_only", "blocked"].includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Valid clientId and status are required.");
    }
    const now = new Date().toISOString();
    const clientRef = admin_1.db.collection("clients").doc(clientId);
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
    await admin_1.db.collection("superAuditLog").add({
        action: "change_client_status",
        clientId,
        performedBy: request.auth?.uid || "superadmin",
        at: now,
        oldStatus,
        newStatus: status,
        reason: reason || null,
    });
});
//# sourceMappingURL=setClientStatus.js.map