import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { RecruiterService } from "@/lib/services/recruiterService";
import { z } from "zod";

const DeleteRecruiterRequestQuerySchema = z.object({
  requestId: z.string().min(1),
  resumeId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const requests = await RecruiterService.getRecruiterRequests(userId);
    return NextResponse.json(
      { requests },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    const errorText = String(error);
    if (errorText.includes("forbidden-role")) {
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
    const errorText = String(error);
    if (errorText.includes("forbidden-role")) {
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

    const parseResult = DeleteRecruiterRequestQuerySchema.safeParse({
      requestId: request.nextUrl.searchParams.get("requestId"),
      resumeId: request.nextUrl.searchParams.get("resumeId"),
    });
    if (!parseResult.success) {
      return handleApiError(null, "Missing requestId or resumeId", 400);
    }
    const { requestId, resumeId } = parseResult.data;

    const result = await RecruiterService.deleteRecruiterRequest(
      userId,
      requestId,
      resumeId,
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorText = String(error);
    if (errorText.includes("forbidden-role")) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }
    if (errorText.includes("request-not-found")) {
      return handleApiError(null, "Request not found", 404);
    }
    if (errorText.includes("unauthorized")) {
      return handleApiError(null, "Unauthorized to delete this request", 403);
    }
    return handleApiError(error, "Failed to delete request");
  }
}
