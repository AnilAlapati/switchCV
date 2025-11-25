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
exports.recruiterRequestService = exports.RecruiterRequestService = void 0;
// functions/src/services/recruiterRequestService.ts
const admin = __importStar(require("firebase-admin"));
const auditLogger_1 = require("./auditLogger");
/**
 * Handles all recruiter request operations
 */
class RecruiterRequestService {
    constructor(db = admin.firestore()) {
        this.db = db;
    }
    async create(data) {
        const batch = this.db.batch();
        const requestRef = this.db.collection("recruiterRequests").doc();
        batch.set(requestRef, Object.assign(Object.assign({}, data), { status: "pending", createdAt: new Date(), updatedAt: new Date() }));
        await batch.commit();
        await auditLogger_1.auditLogger.logRecruiterRequest(requestRef.id, data.recruiterId, data.candidateId, auditLogger_1.AuditAction.RECRUITER_REQUEST_CREATED);
        return requestRef.id;
    }
    async approve(requestId, adminId, reason) {
        const batch = this.db.batch();
        const requestRef = this.db.collection("recruiterRequests").doc(requestId);
        const requestDoc = await requestRef.get();
        const requestData = requestDoc.data();
        if (!requestData) {
            throw new Error("Request not found");
        }
        batch.update(requestRef, {
            status: "approved",
            approvedAt: new Date(),
            approvedBy: adminId,
            approvalReason: reason,
        });
        // Generate access token
        const tokenRef = this.db.collection("accessTokens").doc();
        batch.set(tokenRef, {
            recruiterId: requestData.fromRecruiter.recruiterId,
            userId: requestData.toUserId,
            requestId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            status: "active",
        });
        await batch.commit();
        await auditLogger_1.auditLogger.logRecruiterRequest(requestId, requestData.fromRecruiter.recruiterId, requestData.toUserId, auditLogger_1.AuditAction.RECRUITER_REQUEST_APPROVED, true);
        await auditLogger_1.auditLogger.logAccessToken(requestData.fromRecruiter.recruiterId, requestData.toUserId, tokenRef.id, auditLogger_1.AuditAction.ACCESS_TOKEN_GENERATED);
        return tokenRef.id;
    }
    async deny(requestId, adminId, reason) {
        const requestRef = this.db.collection("recruiterRequests").doc(requestId);
        const requestDoc = await requestRef.get();
        const requestData = requestDoc.data();
        if (!requestData) {
            throw new Error("Request not found");
        }
        await requestRef.update({
            status: "denied",
            deniedAt: new Date(),
            deniedBy: adminId,
            denialReason: reason,
        });
        await auditLogger_1.auditLogger.logRecruiterRequest(requestId, requestData.fromRecruiter.recruiterId, requestData.toUserId, auditLogger_1.AuditAction.RECRUITER_REQUEST_DENIED, false);
    }
}
exports.RecruiterRequestService = RecruiterRequestService;
exports.recruiterRequestService = new RecruiterRequestService();
//# sourceMappingURL=recruiterRequestService.js.map