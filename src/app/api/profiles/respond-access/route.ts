import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { normalizeDuration } from "@/lib/accessDuration";
import { RespondProfileAccessSchema } from "@/lib/schemas/api";
import { AccessService } from "@/lib/services/accessService";

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const parseResult = RespondProfileAccessSchema.safeParse(
      await request.json(),
    );
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid request", 400);
    }

    const { requestId, resumeId, action, grantDuration, timezone } =
      parseResult.data;

    let grantDurationDays: number | undefined;
    if (action === "approve" && grantDuration) {
      try {
        const normalized = normalizeDuration(grantDuration, timezone || "UTC");
        grantDurationDays = normalized.durationMs / (24 * 60 * 60 * 1000);
      } catch (e) {
        return handleApiError(e, "Invalid duration", 400);
      }
    }

    // Call service
    await AccessService.respondToRequest(
      userId,
      String(resumeId),
      requestId,
      action,
      grantDurationDays,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = String(error);
    if (errorMessage.includes("Unauthorized"))
      return handleApiError(error, "Unauthorized", 403);
    if (errorMessage.toLowerCase().includes("not found"))
      return handleApiError(error, "Request not found", 404);
    if (errorMessage.includes("already processed"))
      return handleApiError(error, "Request already processed", 400);
    return handleApiError(error, "Failed to process response");
  }
}
