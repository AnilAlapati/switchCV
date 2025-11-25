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
exports.securityService = exports.SecurityService = void 0;
// functions/src/services/securityService.ts
const admin = __importStar(require("firebase-admin"));
const auditLogger_1 = require("./auditLogger");
const emailService_1 = require("./emailService");
/**
 * Handles security monitoring and suspicious activity detection
 */
class SecurityService {
    constructor(db = admin.firestore()) {
        this.db = db;
    }
    async logSuspiciousActivity(userId, activityType, details) {
        await auditLogger_1.auditLogger.logSuspiciousActivity(userId, activityType, details);
        // Send alert to admins
        const admins = await this.db
            .collection("users")
            .where("role", "==", "admin")
            .get();
        const adminEmails = admins.docs
            .map((doc) => doc.data().email)
            .filter(Boolean);
        if (adminEmails.length > 0) {
            await emailService_1.emailService.sendBulkEmails(adminEmails, "adminNotification", {
                alertType: activityType,
                details,
                userId,
                timestamp: new Date().toISOString(),
                adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
            });
        }
    }
    async validateTokenAccess(tokenId, recruiterId) {
        const tokenDoc = await this.db
            .collection("accessTokens")
            .doc(tokenId)
            .get();
        const token = tokenDoc.data();
        if (!token) {
            await this.logSuspiciousActivity(recruiterId, "INVALID_TOKEN_ACCESS", `Attempted to use invalid token: ${tokenId}`);
            return false;
        }
        if (token.status !== "active") {
            await this.logSuspiciousActivity(recruiterId, "INACTIVE_TOKEN_ACCESS", `Attempted to use inactive token: ${tokenId}`);
            return false;
        }
        if (new Date(token.expiresAt) < new Date()) {
            await this.logSuspiciousActivity(recruiterId, "EXPIRED_TOKEN_ACCESS", `Attempted to use expired token: ${tokenId}`);
            return false;
        }
        return true;
    }
}
exports.SecurityService = SecurityService;
exports.securityService = new SecurityService();
//# sourceMappingURL=securityService.js.map