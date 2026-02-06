/**
 * Interview Assistant API Endpoint
 * POST /api/interview/start - Start new session
 * POST /api/interview/answer - Submit answer
 * GET /api/interview/tips - Get interview tips
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createInterviewSession,
  getInterviewTips,
} from "@/lib/interviewSession";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  // SECURITY: Authenticate user first
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const { action, ...body } = await request.json();

    if (action === "start-session") {
      const { jobTitle, jobDescription, companyName, numberOfQuestions } = body;

      if (!jobTitle) {
        return handleApiError(null, "jobTitle is required", 400);
      }

      const session = createInterviewSession(
        userId!,
        jobTitle,
        jobDescription,
        companyName,
        numberOfQuestions || 5,
      );

      return NextResponse.json(session, { status: 201 });
    }

    if (action === "submit-answer") {
      const { sessionId, questionIndex, answer, duration } = body;

      if (!sessionId || questionIndex === undefined || !answer) {
        return handleApiError(
          null,
          "sessionId, questionIndex, and answer are required",
          400,
        );
      }

      // Note: In production, fetch session from database
      // This is a simplified example
      return NextResponse.json(
        {
          success: true,
          feedback: "Answer recorded successfully",
          duration,
        },
        { status: 200 },
      );
    }

    if (action === "complete-session") {
      const { sessionId } = body;

      if (!sessionId) {
        return handleApiError(null, "sessionId is required", 400);
      }

      // Note: In production, fetch and update session in database
      return NextResponse.json(
        {
          success: true,
          message: "Session completed",
        },
        { status: 200 },
      );
    }

    return handleApiError(
      null,
      "Invalid action. Use: start-session, submit-answer, or complete-session",
      400,
    );
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const jobTitle = searchParams.get("jobTitle");

    if (action === "tips") {
      const tips = getInterviewTips(jobTitle || undefined);
      return NextResponse.json(tips, { status: 200 });
    }

    return handleApiError(null, "Invalid action. Use: ?action=tips", 400);
  } catch (error) {
    return handleApiError(error, "Failed to fetch data");
  }
}
