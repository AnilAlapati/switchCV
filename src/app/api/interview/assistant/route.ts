/**
 * Interview Assistant API Endpoint
 * POST /api/interview/start - Start new session
 * POST /api/interview/answer - Submit answer
 * GET /api/interview/tips - Get interview tips
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createInterviewSession,
  getInterviewTips,
} from "@/lib/interviewSession";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

const StartInterviewSessionSchema = z
  .object({
    action: z.literal("start-session"),
    userId: z.string().optional(),
    jobTitle: z.string().min(1),
    jobDescription: z.string().optional(),
    companyName: z.string().optional(),
    numberOfQuestions: z.number().int().min(1).max(20).optional(),
  })
  .strict();

const SubmitInterviewAnswerSchema = z
  .object({
    action: z.literal("submit-answer"),
    sessionId: z.string().min(1),
    questionIndex: z.number(),
    answer: z.string().min(1),
    duration: z.number().optional(),
  })
  .strict();

const CompleteInterviewSessionSchema = z
  .object({
    action: z.literal("complete-session"),
    sessionId: z.string().min(1),
  })
  .strict();

const InterviewAssistantActionSchema = z.discriminatedUnion("action", [
  StartInterviewSessionSchema,
  SubmitInterviewAnswerSchema,
  CompleteInterviewSessionSchema,
]);

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return handleApiError(
        null,
        "Invalid action. Use: start-session, submit-answer, or complete-session",
        400,
      );
    }

    const { userId: authenticatedUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const parseResult = InterviewAssistantActionSchema.safeParse(payload);
    if (!parseResult.success) {
      const action =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).action
          : undefined;
      if (action === "start-session") {
        return handleApiError(
          parseResult.error,
          "userId and jobTitle are required",
          400,
        );
      }
      if (action === "submit-answer") {
        return handleApiError(
          parseResult.error,
          "sessionId, questionIndex, and answer are required",
          400,
        );
      }
      if (action === "complete-session") {
        return handleApiError(parseResult.error, "sessionId is required", 400);
      }
      return handleApiError(
        parseResult.error,
        "Invalid action. Use: start-session, submit-answer, or complete-session",
        400,
      );
    }

    if (parseResult.data.action === "start-session") {
      const {
        userId: bodyUserId,
        jobTitle,
        jobDescription,
        companyName,
        numberOfQuestions,
      } = parseResult.data;
      const sessionUserId = authenticatedUserId || bodyUserId;

      if (!sessionUserId || !jobTitle) {
        return handleApiError(null, "userId and jobTitle are required", 400);
      }

      const session = createInterviewSession(
        sessionUserId,
        jobTitle,
        jobDescription,
        companyName,
        numberOfQuestions || 5,
      );

      return NextResponse.json(session, { status: 201 });
    }

    if (parseResult.data.action === "submit-answer") {
      const { duration } = parseResult.data;

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

    if (parseResult.data.action === "complete-session") {
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
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

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
