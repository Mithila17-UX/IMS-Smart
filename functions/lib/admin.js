"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.auth = void 0;
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.auth = admin.auth();
exports.db = admin.firestore();
//# sourceMappingURL=admin.js.map