import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Verify admin role via Firebase Auth custom claims
    const { adminAuth } = await import("@/lib/firebase-admin");
    const userRecord = await adminAuth.getUser(userId as string);
    const role = userRecord.customClaims?.role;

    if (role !== "admin") {
      logger.warn({ userId }, "Non-admin attempted to access cost data");
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 },
      );
    }

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

    const data = snapshot.docs
      .map((doc) => ({
        month: doc.id, // YYYY-MM
        ...doc.data(),
        // Convert Timestamp to Date/String for JSON
        lastAggregated: doc.data().lastAggregated?.toDate() || null,
      }))
      .reverse(); // Oldest first for charts

    return NextResponse.json({ costs: data });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch cost data");
    return handleApiError(error, "Failed to fetch cost data");
  }
}
