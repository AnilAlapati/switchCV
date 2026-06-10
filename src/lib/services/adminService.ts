import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

interface SystemStats {
    totalCost: number;
    budgetCap: number;
    usagePercent: number;
}

interface AdminAccessVerification {
    firestoreRole?: unknown;
    customClaimRole?: unknown;
    isAdmin: boolean;
}

async function verifyDualAdminSignals(userId: string): Promise<AdminAccessVerification> {
    const [userDoc, userRecord] = await Promise.all([
        adminDb.collection("users").doc(userId).get(),
        adminAuth.getUser(userId),
    ]);

    const firestoreRole = userDoc.data()?.role;
    const customClaimRole = userRecord.customClaims?.role;
    const firestoreIsAdmin = firestoreRole === "admin";
    const claimsAreAdmin = customClaimRole === "admin";

    if (firestoreIsAdmin !== claimsAreAdmin) {
        logger.warn(
            { userId, firestoreRole, customClaimRole },
            "Admin access signal mismatch",
        );
    }

    return {
        firestoreRole,
        customClaimRole,
        isAdmin: firestoreIsAdmin && claimsAreAdmin,
    };
}

/**
 * Verifies if a user has admin privileges.
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
    try {
        const verification = await verifyDualAdminSignals(userId);
        return verification.isAdmin;
    } catch (error) {
        logger.error({ err: error, userId }, "Error verifying admin access");
        return false;
    }
}

/**
 * Verifies if a user has admin privileges via both Firestore and Firebase Auth.
 */
export async function isAdmin(userId: string): Promise<boolean> {
    try {
        const verification = await verifyDualAdminSignals(userId);
        return verification.isAdmin;
    } catch (error) {
        logger.error({ err: error, userId }, "Error verifying admin role");
        return false;
    }
}

/**
 * Fetches system-wide statistics (billing, usage, etc.).
 */
export async function getSystemStats(): Promise<SystemStats> {
    try {
        // Fetch Billing Stats
        const billingDoc = await adminDb.doc("system/billing").get();
        const billingData = billingDoc.data() || {
            totalCost: 0,
            currentMonthCost: 0,
        };

        // Fetch Config for limits
        const configDoc = await adminDb.doc("config/system").get();
        const configData = configDoc.data() || {};
        const budgetCap = configData.agentic?.budgetCap || 0;

        return {
            totalCost: billingData.totalCost || 0,
            budgetCap,
            usagePercent:
                budgetCap > 0 ? ((billingData.totalCost || 0) / budgetCap) * 100 : 0,
        };
    } catch (error) {
        logger.error({ err: error }, "Error fetching system stats");
        throw error;
    }
}
