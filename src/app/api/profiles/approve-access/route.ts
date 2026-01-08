import { NextRequest, NextResponse } from "next/server";
 
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

interface ApproveAccessPayload {
  requestId: string;
  resumeId: string;
  duration: "1hour" | "1day" | "1week" | "forever";
}

function mapDurationToDays(
  duration: "1hour" | "1day" | "1week" | "forever"
): number {
  switch (duration) {
    case "1hour":
      return 0.04; // 1/24
    case "1day":
      return 1;
    case "1week":
      return 7;
    case "forever":
      return 365 * 10; // 10 years effectively forever
    default:
      return 30;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { requestId, resumeId, duration } =
      (await request.json()) as ApproveAccessPayload;

    if (!requestId || !resumeId || !duration) {
      return handleApiError(null, "Missing required fields", 400);
    }

    if (!["1hour", "1day", "1week", "forever"].includes(duration)) {
      return handleApiError(null, "Invalid duration", 400);
    }

    const durationDays = mapDurationToDays(duration);

    // Call service
    await AccessService.respondToRequest(
      userId,
      resumeId,
      requestId,
      "approve",
      durationDays
    );

    return NextResponse.json({
      success: true,
      message: "Access approved!",
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized"))
      return handleApiError(error, "Unauthorized", 403);
    if (error.message?.toLowerCase().includes("not found"))
      return handleApiError(error, "Not found", 404);
    if (error.message?.includes("already processed"))
      return handleApiError(error, "Request already processed", 400);
    return handleApiError(error, "Failed to approve access");
  }
}
