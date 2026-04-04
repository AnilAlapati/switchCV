// src/app/api/profiles/check-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { AccessService } from "@/lib/services/accessService";

export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const { userId: currentUserId, error } =
      await getAuthenticatedUserId(request);

    if (error) return error;
    if (!currentUserId) {
      return handleApiError(null, "Unauthorized", 401);
    }

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    const result = await AccessService.checkAccessStatus(
      currentUserId,
      resumeId,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: unknown) {
    const errorMessage = String(error);
    if (errorMessage.toLowerCase().includes("not found")) {
      return handleApiError(error, "Resume not found", 404);
    }
    return handleApiError(error, "Failed to check access");
  }
}
