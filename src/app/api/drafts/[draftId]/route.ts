/**
 * Draft API Routes
 *
 * GET /api/drafts/[draftId] - Get a draft by ID (owner only)
 * PATCH /api/drafts/[draftId] - Update a draft (owner only)
 * DELETE /api/drafts/[draftId] - Delete a draft (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { DRAFT_CONFIG } from "@/config/constants";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { getDraftProfileUpdateSchema } from "@/lib/schemas/draftSchema";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;

    const { draftId } = await params;

    const draftDoc = await adminDb
      .collection(DRAFT_CONFIG.COLLECTION)
      .doc(draftId)
      .get();

    if (!draftDoc.exists) {
      return handleApiError(null, "Draft not found", 404);
    }

    const draftData = draftDoc.data();

    // Verify ownership
    if (draftData?.userId !== userId) {
      return handleApiError(null, "Forbidden", 403);
    }

    return NextResponse.json(draftData);
  } catch (error) {
    return handleApiError(error, "Failed to fetch draft");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;

    // Rate Limit
    const constants = await getConstants();
    const rateLimitResult = await checkRateLimit(`${userId}:draft:update`, {
      limit: constants.RATE_LIMITS.DRAFT_UPDATES_PER_MINUTE,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(
        null,
        "Too many updates. Please wait a moment.",
        429
      );
    }

    const { draftId } = await params;

    // Parse and validate request body using Zod schema
    let body: unknown;
    try {
      body = await safeParseBody(request);
    } catch (e) {
      return handleApiError(e, "Invalid JSON payload", 400);
    }

    const { DraftPatchRequestSchema } = await getDraftProfileUpdateSchema();
    const validationResult = DraftPatchRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return handleApiError(null, `Validation failed: ${errorMessages}`, 400);
    }

    const updates = validationResult.data;

    const draftRef = adminDb.collection(DRAFT_CONFIG.COLLECTION).doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      return handleApiError(null, "Draft not found", 404);
    }

    const draftData = draftDoc.data();

    // Verify ownership
    if (draftData?.userId !== userId) {
      return handleApiError(null, "Forbidden", 403);
    }

    // Update the draft
    const now = new Date().toISOString();
    const updatedProfile = {
      ...(draftData?.profile || {}),
      ...updates.profile,
      lastUpdatedAt: now,
    };

    await draftRef.update({
      profile: updatedProfile,
      updatedAt: now,
    });

    // Return the updated data without re-reading from Firestore
    // This eliminates the double-read performance issue
    return NextResponse.json({
      ...draftData,
      profile: updatedProfile,
      updatedAt: now,
    });
  } catch (error) {
    return handleApiError(error, "Failed to update draft");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;

    const { draftId } = await params;

    const draftRef = adminDb.collection(DRAFT_CONFIG.COLLECTION).doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      return handleApiError(null, "Draft not found", 404);
    }

    const draftData = draftDoc.data();

    // Verify ownership
    if (draftData?.userId !== userId) {
      return handleApiError(null, "Forbidden", 403);
    }

    // Delete draft and release ID mapping
    const batch = adminDb.batch();
    batch.delete(draftRef);
    batch.delete(
      adminDb.collection(DRAFT_CONFIG.ID_MAPPING_COLLECTION).doc(draftId)
    );
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete draft");
  }
}
