/**
 * Draft API Routes
 *
 * GET /api/drafts/[draftId] - Get a draft by ID (owner only)
 * PATCH /api/drafts/[draftId] - Update a draft (owner only)
 * DELETE /api/drafts/[draftId] - Delete a draft (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDraft,
  updateDraft,
  deleteDraft,
} from "@/lib/services/draftService";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { ResumeProfile } from "@/types";
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

    const draft = await getDraft(draftId, userId!);

    if (!draft) {
      // getDraft returns null if not found
      return handleApiError(null, "Draft not found", 404);
    }

    return NextResponse.json(draft, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return handleApiError(error, "Forbidden", 403);
    }
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

    // Delegate to Service
    try {
      const updatedDraft = await updateDraft(
        draftId,
        userId!,
        (updates.profile || {}) as unknown as Partial<ResumeProfile>
      );
      return NextResponse.json(updatedDraft);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Draft not found")) {
        return handleApiError(null, "Draft not found", 404);
      }
      if (error instanceof Error && error.message.includes("Forbidden")) {
        return handleApiError(error, "Forbidden", 403);
      }
      throw error;
    }
  } catch (error: unknown) {
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

    try {
      await deleteDraft(draftId, userId!);
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Draft not found")) {
        return handleApiError(null, "Draft not found", 404);
      }
      if (error instanceof Error && error.message.includes("Forbidden")) {
        return handleApiError(error, "Forbidden", 403);
      }
      throw error;
    }
  } catch (error: unknown) {
    return handleApiError(error, "Failed to delete draft");
  }
}
