// src/app/api/profiles/request-access/route.ts
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

interface RequestAccessPayload {
  resumeId: string;
  message?: string;
  duration?: DurationSelectionInput;
  timezone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;
    if (!currentUserId) return handleApiError(null, "Unauthorized", 401);

    const { resumeId, message, duration, timezone } =
      (await request.json()) as RequestAccessPayload;

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    if (!duration) {
      return handleApiError(null, "Duration selection is required", 400);
    }

    let normalizedDuration;
    try {
      normalizedDuration = normalizeDuration(duration, timezone || "UTC");
    } catch (durationError: unknown) {
      const errorMessage = durationError instanceof Error ? durationError.message : String(durationError);
      return handleApiError(
        durationError,
        `Invalid duration selection: ${errorMessage}`,
        400
      );
    }

    // Call service
    const result = await AccessService.requestAccess({
      requesterId: currentUserId,
      requesterName: "User", // Service fetches real name from DB to be safe
      resumeId,
      message,
      durationLabel: normalizedDuration.label,
      durationDays: Math.ceil(
        normalizedDuration.durationMs / (24 * 60 * 60 * 1000)
      ),
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      message: "Request sent! The resume owner will review it soon.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("Limit reached") ||
      errorMessage.includes("Company name is required")
    ) {
      return handleApiError(error, "Access request limit reached or missing company info", 403);
    }
    if (
      errorMessage.includes("Already have access") ||
      errorMessage.includes("Pending request")
    ) {
      return handleApiError(error, "Access already requested or granted", 409);
    }
    if (
      errorMessage.includes("Resume not found") ||
      errorMessage.includes("User not found")
    ) {
      return handleApiError(error, "Not found", 404);
    }
    if (errorMessage.includes("own resume")) {
      return handleApiError(error, "You cannot request access to your own resume", 400);
    }
    return handleApiError(error, "Failed to create access request");
  }
}
