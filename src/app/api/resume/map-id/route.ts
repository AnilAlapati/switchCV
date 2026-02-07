import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { mapResumeId } from "@/lib/resumeIdMapping";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { MapResumeIdSchema } from "@/lib/schemas/api";

/**
 * POST /api/resume/map-id
 * Creates a mapping between a numeric resume ID and its Firestore document ID
 * This is called after a resume is created to enable lookups by numeric ID
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Authentication
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    // Parse request body
    const parseResult = MapResumeIdSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "Missing resumeId or documentId",
        400
      );
    }
    const { resumeId, documentId } = parseResult.data;
    const numericResumeId =
      typeof resumeId === "number" ? resumeId : Number(resumeId);
    if (!Number.isFinite(numericResumeId)) {
      return handleApiError(null, "resumeId must be numeric", 400);
    }

    // Create the mapping
    await mapResumeId(numericResumeId, documentId, userId!);

    logger.info({
      resumeId: numericResumeId,
      documentId,
      userId,
    }, "✅ Resume ID mapping created via API:");

    return NextResponse.json(
      {
        success: true,
        message: "Resume ID mapping created",
        data: { resumeId, documentId },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ err: error }, "❌ Error creating resume ID mapping:");
    return handleApiError(error, "Failed to create resume ID mapping");
  }
}
