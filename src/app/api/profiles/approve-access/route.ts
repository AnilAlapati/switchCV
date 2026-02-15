import { NextRequest, NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";
import { ApproveProfileAccessSchema } from "@/lib/schemas/api";

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
      return 1 / 24;
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

    const payload = await request.json();
    const parseResult = ApproveProfileAccessSchema.safeParse(payload);
    if (!parseResult.success) {
      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : undefined;
      const missingRequiredField =
        !payloadObj ||
        payloadObj.requestId === undefined ||
        payloadObj.resumeId === undefined ||
        payloadObj.duration === undefined;
      const hasDurationError = parseResult.error.issues.some(
        (issue) => issue.path[0] === "duration"
      );
      return handleApiError(
        parseResult.error,
        !missingRequiredField && hasDurationError
          ? "Invalid duration"
          : "Missing required fields",
        400
      );
    }

    const { requestId, resumeId, duration } =
      parseResult.data as ApproveAccessPayload;

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
  } catch (error: unknown) {
    const errorMessage = String(error);

    let status = 500;
    if (errorMessage.includes("not found")) {
      status = 404;
    } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("Permission denied")) {
      status = 403;
    }

    return handleApiError(error, "Failed to approve access: " + errorMessage, status);
  }
}
