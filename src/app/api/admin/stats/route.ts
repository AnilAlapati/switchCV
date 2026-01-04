import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Verify Admin Role
    const userDoc = await adminDb.collection("users").doc(userId!).get();
    const userData = userDoc.data();

    if (userData?.role !== "admin") {
      return handleApiError(new Error("Forbidden"), "Forbidden", 403);
    }

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

    return NextResponse.json({
      totalCost: billingData.totalCost || 0,
      budgetCap,
      usagePercent:
        budgetCap > 0 ? ((billingData.totalCost || 0) / budgetCap) * 100 : 0,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch admin stats");
  }
}
