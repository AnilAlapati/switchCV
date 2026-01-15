import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  DurationSelectionInput,
  normalizeDuration,
} from "@/lib/accessDuration";
import { AccessService } from "@/lib/services/accessService";

interface RespondAccessPayload {
  requestId: string;
  resumeId: string;
  action: "approve" | "deny";
  grantDuration?: DurationSelectionInput;
  timezone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { requestId, resumeId, action, grantDuration, timezone } =
      (await request.json()) as RespondAccessPayload;

    if (!requestId || !resumeId || !["approve", "deny"].includes(action)) {
      return handleApiError(null, "Invalid request", 400);
    }

    let grantDurationDays: number | undefined;
    if (action === "approve" && grantDuration) {
      try {
        const normalized = normalizeDuration(grantDuration, timezone || "UTC");
        grantDurationDays = Math.ceil(normalized.durationMs / (24 * 60 * 60 * 1000));
      } catch (e) {
        return handleApiError(e, "Invalid duration", 400);
      }
    }

    // Call service
    await AccessService.respondToRequest(userId, resumeId, requestId, action, grantDurationDays);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Unauthorized")) return handleApiError(error, "Unauthorized", 403);
    if (errorMessage.toLowerCase().includes("not found")) return handleApiError(error, "Request not found", 404);
    if (errorMessage.includes("already processed")) return handleApiError(error, "Request already processed", 400);
    return handleApiError(error, "Failed to process response: " + errorMessage);
  }
}
