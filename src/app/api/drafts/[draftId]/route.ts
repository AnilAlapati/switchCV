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
} from "@/lib/utils/api-helpers";

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

    const { draftId } = await params;
    const updates = await request.json();

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
    await draftRef.update({
      profile: {
        ...(draftData?.profile || {}),
        ...updates.profile,
        lastUpdatedAt: now,
      },
      updatedAt: now,
    });

    const updatedDoc = await draftRef.get();
    return NextResponse.json(updatedDoc.data());
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
