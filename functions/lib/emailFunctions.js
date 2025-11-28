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
exports.cleanupAuditLogs = exports.notifyAdminSuspiciousActivity = exports.sendProfileViewDigest = exports.onRecruiterRequestApproved = exports.onRecruiterRequestCreated = exports.onUserCreated = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const emailService_1 = require("./services/emailService");
const auditLogger_1 = require("./services/auditLogger");
// ==================== EMAIL FUNCTIONS ====================
/**
 * Send welcome email to new users
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    try {
        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(user.uid)
            .get();
        const userData = userDoc.data();
        // Generate email verification link
        let verificationLink = `${process.env.WEBSITE_URL}/verify-email`; // Fallback
        if (user.email) {
            try {
                verificationLink = await admin.auth().generateEmailVerificationLink(user.email);
            }
            catch (e) {
                console.error("Error generating verification link:", e);
            }
        }
        const result = await emailService_1.emailService.sendEmail({
            to: user.email || "",
            template: "welcomeEmail",
            data: {
                firstName: (userData === null || userData === void 0 ? void 0 : userData.firstName) || user.displayName || "User",
                onboardingUrl: `${process.env.WEBSITE_URL}/onboarding`,
                verificationUrl: verificationLink,
            },
        });
        if (result.success) {
            await auditLogger_1.auditLogger.logEmailSent(user.uid, user.email || "", "welcomeEmail", true);
        }
        else {
            await auditLogger_1.auditLogger.logEmailSent(user.uid, user.email || "", "welcomeEmail", false, result.error);
        }
    }
    catch (error) {
        console.error("Error sending welcome email:", error);
        await auditLogger_1.auditLogger.log({
            userId: user.uid,
            action: auditLogger_1.AuditAction.EMAIL_FAILED,
            resourceType: auditLogger_1.ResourceType.EMAIL,
            resourceId: user.email || "",
            details: `Welcome email failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: "failure",
        });
    }
});
/**
 * Send email when recruiter request is created
 */
exports.onRecruiterRequestCreated = functions.firestore
    .document("recruiterRequests/{requestId}")
    .onCreate(async (snap, context) => {
    var _a, _b;
    try {
        const request = snap.data();
        const toUserId = request.toUserId;
        const candidateDoc = await admin
            .firestore()
            .collection("users")
            .doc(toUserId)
            .get();
        const candidateEmail = (_a = candidateDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
        if (!candidateEmail) {
            throw new Error("Candidate email not found");
        }
        const recruiterDoc = await admin
            .firestore()
            .collection("users")
            .doc(request.fromRecruiter.recruiterId)
            .get();
        const recruiterName = ((_b = recruiterDoc.data()) === null || _b === void 0 ? void 0 : _b.companyName) || "A Recruiter";
        const result = await emailService_1.emailService.sendEmail({
            to: candidateEmail,
            template: "recruiterRequest",
            data: {
                companyName: request.fromRecruiter.companyName || recruiterName,
                position: request.position || "Not specified",
                message: request.message || "",
                dashboardUrl: `${process.env.WEBSITE_URL}/dashboard`,
            },
        });
        if (result.success) {
            await auditLogger_1.auditLogger.logRecruiterRequest(context.params.requestId, request.fromRecruiter.recruiterId, toUserId, auditLogger_1.AuditAction.RECRUITER_REQUEST_CREATED);
        }
    }
    catch (error) {
        console.error("Error sending recruiter request email:", error);
        await auditLogger_1.auditLogger.log({
            userId: "system",
            action: auditLogger_1.AuditAction.EMAIL_FAILED,
            resourceType: auditLogger_1.ResourceType.RECRUITER_REQUEST,
            resourceId: context.params.requestId,
            details: `Failed to send recruiter request email: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: "failure",
        });
    }
});
/**
 * Send email when recruiter request is approved
 */
exports.onRecruiterRequestApproved = functions.firestore
    .document("recruiterRequests/{requestId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c;
    try {
        const before = change.before.data();
        const after = change.after.data();
        // Only trigger if status changed to approved
        if (before.status !== "approved" && after.status === "approved") {
            const recruiterDoc = await admin
                .firestore()
                .collection("users")
                .doc(after.fromRecruiter.recruiterId)
                .get();
            const recruiterEmail = (_a = recruiterDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
            if (!recruiterEmail) {
                throw new Error("Recruiter email not found");
            }
            const candidateDoc = await admin
                .firestore()
                .collection("users")
                .doc(after.toUserId)
                .get();
            const candidateName = ((_b = candidateDoc.data()) === null || _b === void 0 ? void 0 : _b.firstName) || "Candidate";
            const result = await emailService_1.emailService.sendEmail({
                to: recruiterEmail,
                template: "requestApproved",
                data: {
                    candidateName,
                    profileUrl: `${process.env.WEBSITE_URL}/profile/${after.toUserId}`,
                },
            });
            if (result.success) {
                await auditLogger_1.auditLogger.logRecruiterRequest(context.params.requestId, after.fromRecruiter.recruiterId, after.toUserId, auditLogger_1.AuditAction.RECRUITER_REQUEST_APPROVED, true);
            }
        }
        // Trigger if status changed to denied
        if (before.status !== "denied" && after.status === "denied") {
            const recruiterDoc = await admin
                .firestore()
                .collection("users")
                .doc(after.fromRecruiter.recruiterId)
                .get();
            const recruiterEmail = (_c = recruiterDoc.data()) === null || _c === void 0 ? void 0 : _c.email;
            if (!recruiterEmail) {
                throw new Error("Recruiter email not found");
            }
            const result = await emailService_1.emailService.sendEmail({
                to: recruiterEmail,
                template: "requestDenied",
                data: {
                    dashboardUrl: `${process.env.WEBSITE_URL}/recruiter/dashboard`,
                },
            });
            if (result.success) {
                await auditLogger_1.auditLogger.logRecruiterRequest(context.params.requestId, after.fromRecruiter.recruiterId, after.toUserId, auditLogger_1.AuditAction.RECRUITER_REQUEST_DENIED, false);
            }
        }
    }
    catch (error) {
        console.error("Error sending request status email:", error);
        await auditLogger_1.auditLogger.log({
            userId: "system",
            action: auditLogger_1.AuditAction.EMAIL_FAILED,
            resourceType: auditLogger_1.ResourceType.RECRUITER_REQUEST,
            resourceId: context.params.requestId,
            details: `Failed to send status update email: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: "failure",
        });
    }
});
/**
 * Send profile view digest email (weekly)
 */
exports.sendProfileViewDigest = functions.pubsub
    .schedule("every monday 09:00")
    .timeZone("America/New_York")
    .onRun(async (context) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const usersSnapshot = await admin.firestore().collection("users").get();
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userEmail = userDoc.data().email;
            // Get view count for the user's profiles
            const viewsSnapshot = await admin
                .firestore()
                .collectionGroup("views")
                .where("userId", "==", userId)
                .where("timestamp", ">=", oneWeekAgo)
                .get();
            if (viewsSnapshot.size > 0) {
                const result = await emailService_1.emailService.sendEmail({
                    to: userEmail,
                    template: "profileViewed",
                    data: {
                        viewCount: viewsSnapshot.size,
                        dashboardUrl: `${process.env.WEBSITE_URL}/dashboard/analytics`,
                    },
                });
                if (result.success) {
                    await auditLogger_1.auditLogger.log({
                        userId,
                        userEmail,
                        action: auditLogger_1.AuditAction.EMAIL_SENT,
                        resourceType: auditLogger_1.ResourceType.EMAIL,
                        resourceId: userId,
                        details: "Weekly profile view digest sent",
                        status: "success",
                    });
                }
            }
        }
        console.log("Weekly profile view digest sent");
    }
    catch (error) {
        console.error("Error sending profile view digest:", error);
        await auditLogger_1.auditLogger.log({
            userId: "system",
            action: auditLogger_1.AuditAction.EMAIL_FAILED,
            resourceType: auditLogger_1.ResourceType.SYSTEM,
            resourceId: "digest",
            details: `Failed to send profile view digest: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: "failure",
        });
    }
});
/**
 * Send admin notification for suspicious activity
 */
exports.notifyAdminSuspiciousActivity = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new Error("Authentication required");
        }
        const { activityType, details, userId } = data;
        // Log suspicious activity
        await auditLogger_1.auditLogger.logSuspiciousActivity(userId || context.auth.uid, activityType, details);
        // Get admin emails
        const adminsSnapshot = await admin
            .firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();
        const adminEmails = adminsSnapshot.docs
            .map((doc) => doc.data().email)
            .filter(Boolean);
        // Send emails to admins
        await emailService_1.emailService.sendBulkEmails(adminEmails, "adminNotification", {
            alertType: activityType,
            details,
            timestamp: new Date().toISOString(),
            adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
        });
        return { success: true, message: "Admins notified" };
    }
    catch (error) {
        console.error("Error notifying admins:", error);
        throw new functions.https.HttpsError("internal", "Failed to notify admins");
    }
});
/**
 * Cleanup old audit logs (daily)
 */
exports.cleanupAuditLogs = functions.pubsub
    .schedule("every day 02:00")
    .timeZone("America/New_York")
    .onRun(async (context) => {
    try {
        const deletedCount = await auditLogger_1.auditLogger.cleanupOldLogs(90); // Keep 90 days
        console.log(`Cleaned up ${deletedCount} old audit logs`);
    }
    catch (error) {
        console.error("Error cleaning up audit logs:", error);
    }
});
//# sourceMappingURL=emailFunctions.js.map