import { NextRequest, NextResponse } from "next/server";
import { getAdminAiMonitoringData } from "@/lib/services/adminAiMonitoringService";
import { verifyAdminAccess } from "@/lib/services/adminService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const isAdmin = await verifyAdminAccess(userId!);
    if (!isAdmin) {
      return handleApiError(new Error("Forbidden"), "Forbidden", 403, request);
    }

    const payload = await getAdminAiMonitoringData({
      requestId: request.nextUrl.searchParams.get("requestId"),
      limit: request.nextUrl.searchParams.get("limit"),
      days: request.nextUrl.searchParams.get("days"),
      stage: request.nextUrl.searchParams.get("stage"),
      failureCode: request.nextUrl.searchParams.get("failureCode"),
      provider: request.nextUrl.searchParams.get("provider"),
      model: request.nextUrl.searchParams.get("model"),
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(
      error,
      "Failed to fetch AI monitoring data",
      500,
      request,
    );
  }
}
