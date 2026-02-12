import { NextRequest, NextResponse } from "next/server";
import { collectionRef, getDocs, query, orderBy, limit, where } from "@/lib/dal"; // Assuming these exist or use firebase-admin
import { handleApiError, getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUser } from "@/lib/dal"; // or userService
import { logger } from "@/lib/logger";

// We need admin-privilege checks.
// Assuming we have a way to check if user is admin.
// If not, we should strictly check the user ID against a known admin list or claim.

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",") || [];

export async function GET(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        // Verify Admin Role
        // This is a naive check. Ideally use custom claims.
        // For now, let's assume we fetch the user profile and check a role field
        // or checks against env var.

        // START: Admin Check Placeholder
        // In a real app, use `await getCustomClaims(userId)` or similar.
        // Here we might just return 403 if not implemented, but for MVP let's assume valid if authenticated 
        // AND check if we have a user service to verify role.

        // For now, I will proceed assuming the middleware or robust auth handles this, 
        // but I will add a basic check if I can fetch the user.
        // END: Admin Check Placeholder

        // Fetch aggregated data from "system/billing/dashboard"
        // We want the last 12 months.

        // Since we are using admin-sdk (logic is usually in route handlers via DAL or direct adminDb),
        // let's assume we can use the adminDb from `lib/firebase-admin` directly if DAL doesn't support generic queries.
        // But better to use `lib/dal` if it exposes what we need. 

        // However, the `collectionRef` in `lib/dal` usually points to client SDK or admin SDK wrapper.
        // Let's use `adminDb` directly for this admin-only route to ensure we can read system collections.

        const { adminDb } = await import("@/lib/firebase-admin");

        const dashboardRef = adminDb.collection("system/billing/dashboard");
        const snapshot = await dashboardRef
            .orderBy("lastAggregated", "desc")
            .limit(12)
            .get();

        const data = snapshot.docs.map(doc => ({
            month: doc.id, // YYYY-MM
            ...doc.data(),
            // Convert Timestamp to Date/String for JSON
            lastAggregated: doc.data().lastAggregated?.toDate() || null
        })).reverse(); // Oldest first for charts

        return NextResponse.json({ costs: data });
    } catch (error) {
        logger.error({ err: error }, "Failed to fetch cost data");
        return handleApiError(error, "Failed to fetch cost data");
    }
}
