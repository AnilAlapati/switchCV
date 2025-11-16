import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";

/**
 * POST /api/resume/map-id
 * Creates a mapping between a numeric resume ID and its Firestore document ID
 * This is called after a resume is created to enable lookups by numeric ID
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from request header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // Parse request body
    const { resumeId, documentId } = await request.json();

    if (!resumeId || !documentId) {
      return NextResponse.json(
        { error: "Missing resumeId or documentId" },
        { status: 400 }
      );
    }

    // Create the mapping
    await mapResumeId(resumeId, documentId, userId);

    console.log("✅ Resume ID mapping created via API:", {
      resumeId,
      documentId,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Resume ID mapping created",
        data: { resumeId, documentId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating resume ID mapping:", error);
    return NextResponse.json(
      {
        error: "Failed to create resume ID mapping",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
