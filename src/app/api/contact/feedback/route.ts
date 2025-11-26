import { NextRequest, NextResponse } from "next/server";
import {
  sendSupportFeedback,
  SupportFeedbackPayload,
  SupportFeedbackError,
} from "@/lib/services/supportFeedbackService";
import {
  getClientIp,
  handleApiError,
  safeParseBody,
  maybeGetAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { adminAuth } from "@/lib/firebase-admin";
import type { SupportFeedbackMeta } from "@/types/supportFeedback";

/**
 * Try to get authenticated user info from request (optional - doesn't fail if not logged in)
 */
async function tryGetAuthenticatedUser(
  request: NextRequest
): Promise<SupportFeedbackMeta["authenticatedUser"]> {
  try {
    const userId = await maybeGetAuthenticatedUserId(request);
    if (!userId) {
      return null;
    }
    // Fetch user details from Firebase Auth
    const userRecord = await adminAuth.getUser(userId);
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
    };
  } catch {
    // Any error - return null, feedback is public
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await safeParseBody<SupportFeedbackPayload>(request);

    // Try to get authenticated user (optional - won't fail if not logged in)
    const authenticatedUser = await tryGetAuthenticatedUser(request);

    const result = await sendSupportFeedback(body, {
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      authenticatedUser,
    });

    return NextResponse.json({
      ...result,
      message: result.simulated
        ? "Feedback captured (email delivery simulated)"
        : "Feedback delivered to support",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleApiError(error, "Invalid JSON payload", 400);
    }
    if (error instanceof SupportFeedbackError) {
      return handleApiError(error, error.message, error.statusCode);
    }

    return handleApiError(error, "Unable to send feedback right now");
  }
}
