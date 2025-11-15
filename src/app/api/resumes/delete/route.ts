/**
 * Delete Resume API Route
 *
 * Handles resume deletion requests with proper authorization
 *
 * Endpoints:
 * - POST /api/resumes/delete-by-id
 *   Body: { resumeDocumentId: string }
 *
 * - POST /api/resumes/delete-by-numeric-id
 *   Body: { numericId: number }
 *
 * - POST /api/resumes/delete-by-slug
 *   Body: { slug: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteResumeById, deleteResumeByNumericId } from "@/lib/resumeDeleter";
import { getIdPoolStats } from "@/lib/resumeIdRecycler";

/**
 * DELETE /api/resumes/delete-by-id
 * Delete resume by its Firestore document ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeDocumentId, userId } = body;

    if (!resumeDocumentId) {
      return NextResponse.json(
        { error: "resumeDocumentId is required" },
        { status: 400 }
      );
    }

    const result = await deleteResumeById(resumeDocumentId, userId);

    // Add pool statistics to response for monitoring
    const poolStats = await getIdPoolStats();

    return NextResponse.json(
      {
        ...result,
        poolStats,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error("Error in delete resume API:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes/delete
 * Delete resume by numeric ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { numericId, userId } = body;

    if (!numericId) {
      return NextResponse.json(
        { error: "numericId is required" },
        { status: 400 }
      );
    }

    const result = await deleteResumeByNumericId(numericId, userId);

    // Add pool statistics to response
    const poolStats = await getIdPoolStats();

    return NextResponse.json(
      {
        ...result,
        poolStats,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error("Error in delete resume API:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
