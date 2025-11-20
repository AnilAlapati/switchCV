import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // 2. Parse Body
    const body = await request.json();

    // Basic validation
    if (!body) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    // 3. Generate ID
    const numericId = await generateNumericResumeId();
    const resumeId = numericId.toString();

    // 4. Prepare Resume Document
    const resumeData = {
      ...body,
      id: resumeId,
      userId,
      numericId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false, // Default to private
      status: "draft",
    };

    // 5. Save to Firestore
    // Using the numeric ID as the document ID for clean URLs
    await adminDb.collection("resumes").doc(resumeId).set(resumeData);

    // 6. Update User Profile with a reference
    // This helps in listing user's resumes without querying the main collection
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("userResumes")
      .doc(resumeId)
      .set({
        id: resumeId,
        title: body.title || "Untitled Resume",
        createdAt: resumeData.createdAt,
        updatedAt: resumeData.updatedAt,
        numericId,
      });

    return NextResponse.json({
      success: true,
      resumeId,
      numericId,
    });
  } catch (error) {
    console.error("Error creating resume:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
