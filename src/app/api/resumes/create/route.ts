import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { Resume } from "@/lib/resumeComparison.types";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

interface CreateResumeRequest {
  userId: string;
  resume: Resume;
  isPublic?: boolean;
}

interface CreateResumeResponse {
  success: boolean;
  resumeId: string;
  numericId: number;
  publicUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: authenticatedUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;

    // Parse request body
    const body = (await request.json()) as CreateResumeRequest;
    const { userId, resume, isPublic = true } = body;

    if (!userId || !resume) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields: userId or resume",
        400
      );
    }

    // Security: Only users can save their own resumes
    if (authenticatedUserId !== userId) {
      return handleApiError(
        new Error("Unauthorized"),
        "Unauthorized: Cannot save resume for another user",
        403
      );
    }

    // Generate numeric ID (1-99,999,999)
    const numericId = await generateNumericResumeId();

    if (!numericId) {
      return handleApiError(
        new Error("Failed to generate ID"),
        "Failed to generate numeric resume ID",
        500
      );
    }

    // Prepare resume document
    const resumeDoc = {
      ...resume,
      userId,
      numericId,
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      published: isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    };

    // Save to Firestore using Batch Write
    const batch = adminDb.batch();

    // 1. Main Resume Document
    // Structure: resumes/{numericId} (Root collection for easy access by ID)
    const docRef = adminDb.collection("resumes").doc(String(numericId));
    batch.set(docRef, resumeDoc);

    // 2. User's Subcollection
    const userResumeRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("resumes")
      .doc(String(numericId));

    batch.set(userResumeRef, {
      ...resumeDoc,
      // We can store full data or just metadata here
    });

    // 3. Global Resumes Collection (for search/listing)
    const globalResumesRef = adminDb
      .collection("allResumes")
      .doc(String(numericId));

    batch.set(globalResumesRef, {
      userId,
      numericId,
      title: resume.title,
      isPublic: isPublic,
      createdAt: new Date().toISOString(),
    });

    // Commit all writes atomically
    await batch.commit();

    console.log(`✅ Resume saved successfully`, {
      userId,
      numericId,
      resumeTitle: resume.title,
      isPublic,
    });

    const response: CreateResumeResponse = {
      success: true,
      resumeId: String(numericId),
      numericId,
      publicUrl: `/resumes/${numericId}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error creating resume:", error);
    return handleApiError(error, "Failed to create resume");
  }
}
