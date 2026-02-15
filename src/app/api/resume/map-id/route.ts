import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import {
  mapResumeId,
  getDocumentIdFromResumeId,
  getResumeIdFromDocumentId,
} from "@/lib/resumeIdMapping";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
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

    // Ensure the document exists and belongs to the authenticated user
    let resumeDoc = await collectionRef(COLLECTIONS.RESUMES).doc(documentId).get();
    if (!resumeDoc.exists) {
      resumeDoc = await collectionRef(COLLECTIONS.RESUME_PROFILES).doc(documentId).get();
    }
    if (!resumeDoc.exists) {
      return handleApiError(null, "Resume document not found", 404);
    }
    if (resumeDoc.data()?.userId !== userId) {
      return handleApiError(
        null,
        "Forbidden: You can only map your own resume document",
        403
      );
    }

    // Prevent cross-document overwrite for an existing numeric resume ID
    const existingMapping = await getDocumentIdFromResumeId(numericResumeId);
    if (existingMapping) {
      if (
        existingMapping.documentId === documentId &&
        existingMapping.userId === userId
      ) {
        return NextResponse.json(
          {
            success: true,
            message: "Resume ID mapping already exists",
            data: { resumeId, documentId },
          },
          { status: 200 }
        );
      }
      return handleApiError(
        null,
        "Mapping already exists for this resumeId",
        409
      );
    }

    // Prevent the same document being mapped to a different numeric resume ID
    const existingResumeId = await getResumeIdFromDocumentId(documentId);
    if (
      typeof existingResumeId === "number" &&
      existingResumeId !== numericResumeId
    ) {
      return handleApiError(
        null,
        `Document is already mapped to resumeId ${existingResumeId}`,
        409
      );
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
