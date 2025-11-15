"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileAccessService = exports.ProfileAccessService = void 0;
// functions/src/services/profileAccessService.ts
const admin = __importStar(require("firebase-admin"));
const auditLogger_1 = require("./auditLogger");
/**
 * Handles profile access logging and PII protection
 */
class ProfileAccessService {
    constructor(db = admin.firestore()) {
        this.db = db;
    }
    async logProfileAccess(accessorId, profileOwnerId, accessType) {
        var _a;
        const accessorDoc = await this.db.collection("users").doc(accessorId).get();
        const accessLog = {
            accessorId,
            profileOwnerId,
            accessType,
            timestamp: new Date(),
            accessorRole: (_a = accessorDoc.data()) === null || _a === void 0 ? void 0 : _a.role,
        };
        await this.db.collection("profileAccessLogs").add(accessLog);
        await auditLogger_1.auditLogger.logProfileAccessed(accessorId, profileOwnerId, accessType);
    }
}
exports.ProfileAccessService = ProfileAccessService;
exports.profileAccessService = new ProfileAccessService();
//# sourceMappingURL=profileAccessService.js.map