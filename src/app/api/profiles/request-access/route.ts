// src/app/api/profiles/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  normalizeDuration,
} from "@/lib/accessDuration";
import { RequestProfileAccessSchema } from "@/lib/schemas/api";
import { AccessService } from "@/lib/services/accessService";

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;
    if (!currentUserId) return handleApiError(null, "Unauthorized", 401);

    const payload = await request.json();
    const parseResult = RequestProfileAccessSchema.safeParse(payload);
    if (!parseResult.success) {
      const hasDurationValue = Boolean(
        payload &&
        typeof payload === "object" &&
        "duration" in (payload as Record<string, unknown>)
      );
      const hasResumeIdError = parseResult.error.issues.some(
        (issue) => issue.path[0] === "resumeId"
      );
      const hasDurationError = parseResult.error.issues.some(
        (issue) => issue.path[0] === "duration"
      );
      const message = hasResumeIdError
        ? "Resume ID is required"
        : hasDurationError && !hasDurationValue
          ? "Duration selection is required"
          : hasDurationError
            ? "Invalid duration selection"
            : "Invalid request payload";
      return handleApiError(parseResult.error, message, 400);
    }

    const { resumeId, message, duration, timezone } = parseResult.data;

    let normalizedDuration;
    try {
      normalizedDuration = normalizeDuration(duration, timezone || "UTC");
    } catch (durationError: unknown) {
      return handleApiError(
        durationError,
        "Invalid duration selection",
        400
      );
    }

    // Call service
    const result = await AccessService.requestAccess({
      requesterId: currentUserId,
      requesterName: "User", // Service fetches real name from DB to be safe
      resumeId: String(resumeId),
      message,
      durationLabel: normalizedDuration.label,
      durationDays: normalizedDuration.durationMs / (24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      message: "Request sent! The resume owner will review it soon.",
    });
  } catch (error: unknown) {
    const errorMessage = String(error);

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
