import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sanitizeResumePayload } from "@/lib/utils/resumeEditor";
import {
  getAuthenticatedUserId,
  fetchResumeDocument,
  handleApiError,
  verifyResumeOwnership,
} from "@/lib/utils/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    // Block access to ID 1 (Reserved)
    if (id === "1") {
      return handleApiError(
        new Error("Reserved System ID"),
        "This ID is reserved for system demonstration purposes and is not publicly accessible.",
        403
      );
    }

    const resumeDoc = await fetchResumeDocument(id);

    if (!resumeDoc) {
      return handleApiError(
        new Error("Resume not found"),
        "Resume not found",
        404
      );
    }

    const { data: resumeData } = resumeDoc;
    const isPublic =
      resumeData?.isPublic ||
      resumeData?.visibility === "public" ||
      resumeData?.published === true;

    // 3. Security Check
    // If public, allow access
    if (isPublic) {
      return NextResponse.json(resumeData);
    }

    // If private, verify authentication
    const { userId: requestUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    const ownerId = resumeData?.userId;

    if (requestUserId !== ownerId) {
      // Check if user is admin (optional, but good for support)
      const userDoc = await adminDb
        .collection("users")
        .doc(requestUserId!)
        .get();
      const userData = userDoc.data();
      if (userData?.role !== "admin") {
        return handleApiError(
          new Error("Permission denied"),
          "Permission denied",
          403
        );
      }
    }

    // 4. Return Data
    return NextResponse.json(resumeData);
  } catch (error) {
    return handleApiError(error, "Error fetching resume");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== "boolean") {
      return handleApiError(
        new Error("Invalid visibility state"),
        "Invalid visibility state",
        400
      );
    }

    const verification = await verifyResumeOwnership(request, id);
    if (!verification.success) {
      return verification.error;
    }

    const { docRef } = verification;

    // Update Visibility
    await docRef.update({
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    return handleApiError(error, "Error updating resume visibility");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    const verification = await verifyResumeOwnership(request, id);
    if (!verification.success) {
      return verification.error;
    }

    const {
      userId: requestUserId,
      docRef,
      resumeData: existingData,
    } = verification;

    const body = await request.json();
    const resumePayload = body?.resume;

    if (!resumePayload || typeof resumePayload !== "object") {
      return handleApiError(
        new Error("Invalid resume payload"),
        "Invalid resume payload",
        400
      );
    }

    const sanitizedResume = sanitizeResumePayload(resumePayload);
    const timestamp = new Date().toISOString();

    await docRef.set(
      {
        ...sanitizedResume,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
      },
      { merge: true }
    );

    try {
      await adminDb
        .collection("users")
        .doc(requestUserId)
        .collection("resumes")
        .doc(id)
        .set(
          {
            ...sanitizedResume,
            updatedAt: timestamp,
            lastUpdatedAt: timestamp,
            userId: requestUserId,
            numericId: existingData?.numericId,
            isPublic: existingData?.isPublic,
            visibility: existingData?.visibility,
          },
          { merge: true }
        );
    } catch (subcollectionError) {
      console.error(
        "Error updating user resume subcollection:",
        subcollectionError
      );
    }

    try {
      await adminDb
        .collection("allResumes")
        .doc(id)
        .set(
          {
            title: sanitizedResume.title ?? existingData?.title,
            updatedAt: timestamp,
            userId: requestUserId,
            numericId: existingData?.numericId,
            isPublic: existingData?.isPublic,
          },
          { merge: true }
        );
    } catch (globalError) {
      console.error("Error updating allResumes collection:", globalError);
    }

    const refreshedSnap = await docRef.get();
    const refreshedData = refreshedSnap.data() ?? {};

    return NextResponse.json({
      success: true,
      resume: {
        ...refreshedData,
        id,
      },
    });
  } catch (error) {
    return handleApiError(error, "Error updating resume");
  }
}
