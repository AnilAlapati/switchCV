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

export async function POST(request: NextRequest) {
  try {
    const { action, ...body } = await request.json();

    if (action === "start-session") {
      const {
        userId,
        jobTitle,
        jobDescription,
        companyName,
        numberOfQuestions,
      } = body;

      if (!userId || !jobTitle) {
        return NextResponse.json(
          { error: "userId and jobTitle are required" },
          { status: 400 }
        );
      }

      const session = createInterviewSession(
        userId,
        jobTitle,
        jobDescription,
        companyName,
        numberOfQuestions || 5
      );

      return NextResponse.json(session, { status: 201 });
    }

    if (action === "submit-answer") {
      const { sessionId, questionIndex, answer, duration } = body;

      if (!sessionId || questionIndex === undefined || !answer) {
        return NextResponse.json(
          { error: "sessionId, questionIndex, and answer are required" },
          { status: 400 }
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
        { status: 200 }
      );
    }

    if (action === "complete-session") {
      const { sessionId } = body;

      if (!sessionId) {
        return NextResponse.json(
          { error: "sessionId is required" },
          { status: 400 }
        );
      }

      // Note: In production, fetch and update session in database
      return NextResponse.json(
        {
          success: true,
          message: "Session completed",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use: start-session, submit-answer, or complete-session",
      },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process request", details: errorMessage },
      { status: 500 }
    );
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

    return NextResponse.json(
      { error: "Invalid action. Use: ?action=tips" },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch data", details: errorMessage },
      { status: 500 }
    );
  }
}
