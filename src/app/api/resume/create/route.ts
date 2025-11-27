import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError || !userId) {
      return (
        authError ||
        handleApiError(new Error("Unauthorized"), "Unauthorized", 401)
      );
    }

    // 2. Parse Body
    const body = await request.json();

    // Basic validation
    if (!body) {
      return handleApiError(
        new Error("Resume data is required"),
        "Resume data is required",
        400
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
      published: false,
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
    return handleApiError(error, "Error creating resume");
  }
}
