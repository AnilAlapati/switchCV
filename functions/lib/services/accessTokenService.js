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
exports.accessTokenService = exports.AccessTokenService = void 0;
// functions/src/services/accessTokenService.ts
const admin = __importStar(require("firebase-admin"));
const auditLogger_1 = require("./auditLogger");
/**
 * Handles all access token operations
 */
class AccessTokenService {
    constructor(db = admin.firestore()) {
        this.db = db;
    }
    async revoke(tokenId, reason) {
        const tokenRef = this.db.collection("accessTokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();
        const tokenData = tokenDoc.data();
        if (!tokenData) {
            throw new Error("Token not found");
        }
        await tokenRef.update({
            status: "revoked",
            revokedAt: new Date(),
            revocationReason: reason,
        });
        await auditLogger_1.auditLogger.logAccessToken(tokenData.recruiterId, tokenData.userId, tokenId, auditLogger_1.AuditAction.ACCESS_TOKEN_REVOKED);
    }
    async verify(tokenId, recruiterId) {
        const tokenDoc = await this.db
            .collection("accessTokens")
            .doc(tokenId)
            .get();
        const token = tokenDoc.data();
        if (!token) {
            return false;
        }
        if (token.status !== "active") {
            return false;
        }
        if (new Date(token.expiresAt) < new Date()) {
            return false;
        }
        // Update token usage
        await tokenDoc.ref.update({
            lastUsedAt: new Date(),
            usageCount: (token.usageCount || 0) + 1,
        });
        return true;
    }
    async recordUsage(tokenId) {
        const tokenRef = this.db.collection("accessTokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();
        const token = tokenDoc.data();
        if (!token) {
            throw new Error("Token not found");
        }
        await tokenRef.update({
            lastUsedAt: new Date(),
            usageCount: (token.usageCount || 0) + 1,
        });
    }
}
exports.AccessTokenService = AccessTokenService;
exports.accessTokenService = new AccessTokenService();
//# sourceMappingURL=accessTokenService.js.map