import { NextRequest, NextResponse } from "next/server";
import {
  sendSupportFeedback,
  SupportFeedbackError,
  checkRateLimit,
} from "@/lib/services/supportFeedbackService";
import {
  getClientIp,
  handleApiError,
  safeParseBody,
  maybeGetAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getAuthUser } from "@/lib/services/authService";
import type { SupportFeedbackMeta } from "@/types/supportFeedback";
import { z } from "zod";

// Bot protection constants
const MIN_FORM_TIME_MS = 2000; // Server-side: minimum 2 seconds (slightly lower than client)

/**
 * Zod schema for feedback payload — runtime validation matching SupportFeedbackPayload type
 */
const SupportFeedbackSchema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().email().max(255),
  message: z.string().min(20).max(2000),
  category: z.enum(["bug", "idea", "data", "billing", "other"]).optional(),
  urgency: z.enum(["low", "normal", "high"]).optional(),
  allowContact: z.boolean().optional(),
  pageContext: z.string().max(120).optional(),
  _formTime: z.number().optional(),
});

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
    // Fetch user details from AuthService
    return await getAuthUser(userId);
  } catch {
    // Any error - return null, feedback is public
    return null;
  }
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // Rate limiting check
    if (checkRateLimit(clientIp)) {
      return handleApiError(
        new Error("Too many requests"),
        "You've submitted too many feedback requests. Please try again later.",
        429
      );
    }

    const rawBody = await safeParseBody(request);
    const parseResult = SupportFeedbackSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid feedback submission", 400);
    }

    const body = parseResult.data;

    // Bot protection: Check form fill time (server-side validation)
    if (body._formTime !== undefined && body._formTime < MIN_FORM_TIME_MS) {
      // Suspicious - form was filled too quickly
      // Log it but don't give helpful error to potential bots
      return NextResponse.json({
        success: true,
        referenceId: `FB-${Date.now().toString(36)}`,
        message: "Feedback received",
      });
    }

    // Remove internal field before processing
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _formTime, ...feedbackPayload } = body;

    // Try to get authenticated user (optional - won't fail if not logged in)
    const authenticatedUser = await tryGetAuthenticatedUser(request);

    const result = await sendSupportFeedback(feedbackPayload, {
      ipAddress: clientIp,
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
      return handleApiError(error, "Unable to process feedback submission", error.statusCode);
    }

    return handleApiError(error, "Unable to send feedback right now");
  }
}
