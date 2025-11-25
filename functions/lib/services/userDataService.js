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
exports.userDataService = exports.UserDataService = void 0;
// functions/src/services/userDataService.ts
const admin = __importStar(require("firebase-admin"));
const auditLogger_1 = require("./auditLogger");
/**
 * Handles user data management including exports and deletions
 */
class UserDataService {
    constructor(db = admin.firestore()) {
        this.db = db;
    }
    async updateProfile(userId, changes) {
        const userRef = this.db.collection("users").doc(userId);
        const before = (await userRef.get()).data();
        await userRef.update(Object.assign(Object.assign({}, changes), { updatedAt: new Date() }));
        await auditLogger_1.auditLogger.log({
            userId,
            action: auditLogger_1.AuditAction.USER_UPDATED,
            resourceType: auditLogger_1.ResourceType.USER,
            resourceId: userId,
            changes: {
                before,
                after: Object.assign(Object.assign({}, before), changes),
            },
            status: "success",
        });
    }
    async exportUserData(userId) {
        const user = await this.db.collection("users").doc(userId).get();
        const profiles = await this.db
            .collection("profiles")
            .where("userId", "==", userId)
            .get();
        const resumes = await this.db
            .collectionGroup("resumes")
            .where("userId", "==", userId)
            .get();
        const requests = await this.db
            .collection("recruiterRequests")
            .where("toUserId", "==", userId)
            .get();
        const accessTokens = await this.db
            .collection("accessTokens")
            .where("userId", "==", userId)
            .get();
        const auditLogs = await auditLogger_1.auditLogger.getUserAuditLogs(userId, 1000);
        const exportData = {
            userProfile: user.data(),
            profiles: profiles.docs.map((doc) => doc.data()),
            resumes: resumes.docs.map((doc) => doc.data()),
            recruiterRequests: requests.docs.map((doc) => doc.data()),
            accessTokens: accessTokens.docs.map((doc) => doc.data()),
            auditLogs,
            exportedAt: new Date().toISOString(),
        };
        await auditLogger_1.auditLogger.log({
            userId,
            action: auditLogger_1.AuditAction.DATA_EXPORT,
            resourceType: auditLogger_1.ResourceType.USER,
            resourceId: userId,
            details: "User data export for GDPR compliance",
            status: "success",
        });
        return exportData;
    }
    async deleteAccount(userId, reason) {
        try {
            await auditLogger_1.auditLogger.log({
                userId,
                action: auditLogger_1.AuditAction.USER_DELETED,
                resourceType: auditLogger_1.ResourceType.USER,
                resourceId: userId,
                details: `Account deleted. Reason: ${reason || "Not provided"}`,
                status: "success",
            });
            const batch = this.db.batch();
            batch.delete(this.db.collection("users").doc(userId));
            const profiles = await this.db
                .collection("profiles")
                .where("userId", "==", userId)
                .get();
            profiles.forEach((doc) => batch.delete(doc.ref));
            const resumes = await this.db
                .collectionGroup("resumes")
                .where("userId", "==", userId)
                .get();
            resumes.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            await admin.auth().deleteUser(userId);
        }
        catch (error) {
            await auditLogger_1.auditLogger.log({
                userId,
                action: auditLogger_1.AuditAction.USER_DELETED,
                resourceType: auditLogger_1.ResourceType.USER,
                resourceId: userId,
                details: `Account deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                status: "failure",
            });
            throw error;
        }
    }
}
exports.UserDataService = UserDataService;
exports.userDataService = new UserDataService();
//# sourceMappingURL=userDataService.js.map