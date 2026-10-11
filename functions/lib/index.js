"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setClaims = exports.resetPassword = exports.createUser = exports.setClientStatus = exports.setEntitlements = exports.createClient = void 0;
var createClient_1 = require("./clients/createClient");
Object.defineProperty(exports, "createClient", { enumerable: true, get: function () { return createClient_1.createClient; } });
var setEntitlements_1 = require("./clients/setEntitlements");
Object.defineProperty(exports, "setEntitlements", { enumerable: true, get: function () { return setEntitlements_1.setEntitlements; } });
var setClientStatus_1 = require("./clients/setClientStatus");
Object.defineProperty(exports, "setClientStatus", { enumerable: true, get: function () { return setClientStatus_1.setClientStatus; } });
var createUser_1 = require("./users/createUser");
Object.defineProperty(exports, "createUser", { enumerable: true, get: function () { return createUser_1.createUser; } });
var resetPassword_1 = require("./users/resetPassword");
Object.defineProperty(exports, "resetPassword", { enumerable: true, get: function () { return resetPassword_1.resetPassword; } });
var setClaims_1 = require("./users/setClaims");
Object.defineProperty(exports, "setClaims", { enumerable: true, get: function () { return setClaims_1.setClaims; } });
//# sourceMappingURL=index.js.map