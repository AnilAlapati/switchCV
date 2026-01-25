import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { RecruiterService } from "@/lib/services/recruiterService";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const requests = await RecruiterService.getRecruiterRequests(userId);
    return NextResponse.json({ requests });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "forbidden-role") {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }
    return handleApiError(error, "Failed to fetch recruiter requests");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    await RecruiterService.enforceRecruiterRole(userId);

    // This route could be used for bulk requests or other recruiter-specific POST actions
    // For now, we'll just return a 405 or handle simple ping
    return handleApiError(null, "Method not allowed", 405);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "forbidden-role") {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }
    return handleApiError(error, "Failed to process recruiter request");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    const resumeId = searchParams.get("resumeId");

    if (!requestId || !resumeId) {
      return handleApiError(null, "Missing requestId or resumeId", 400);
    }

    const result = await RecruiterService.deleteRecruiterRequest(
      userId,
      requestId,
      resumeId,
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "forbidden-role") {
        return handleApiError(null, "Forbidden: Recruiter role required", 403);
      }
      if (error.message === "request-not-found") {
        return handleApiError(null, "Request not found", 404);
      }
      if (error.message === "unauthorized") {
        return handleApiError(null, "Unauthorized to delete this request", 403);
      }
    }
    return handleApiError(error, "Failed to delete request");
  }
}
