import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

interface SystemStats {
    totalCost: number;
    budgetCap: number;
    usagePercent: number;
}

/**
 * Verifies if a user has admin privileges.
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
    try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        const userData = userDoc.data();
        return userData?.role === "admin";
    } catch (error) {
        logger.error({ err: error, userId }, "Error verifying admin access");
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
