import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { verifyAdminAccess, getSystemStats } from "@/lib/services/adminService";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Verify Admin Role
    const isAdmin = await verifyAdminAccess(userId!);
    if (!isAdmin) {
      return handleApiError(new Error("Forbidden"), "Forbidden", 403);
    }

    // Fetch Stats
    const stats = await getSystemStats();

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch admin stats");
  }
}
