import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

/**
 * Helper to verify admin role
 */
async function verifyAdminRole(userId: string): Promise<boolean> {
  const userSnap = await adminDb.collection("users").doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "admin";
}

export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyAdminRole(authUserId))) {
      return handleApiError(null, "Forbidden: Admin role required", 403);
    }

    // Get all published resumes
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("published", "==", true)
      .limit(50)
      .get();

    const resumes = [];

    for (const doc of resumesSnapshot.docs) {
      const resumeData = doc.data();
      const userDoc = await adminDb
        .collection("users")
        .doc(resumeData.userId)
        .get();

      resumes.push({
        resumeId: doc.id,
        title: resumeData.title || "Untitled",
        userId: resumeData.userId,
        userName: userDoc.exists
          ? userDoc.data()?.displayName || userDoc.data()?.email || "Unknown"
          : "Unknown",
        published: resumeData.published,
        createdAt: resumeData.createdAt,
      });
    }

    return NextResponse.json({
      message: "All published resumes",
      total: resumes.length,
      resumes,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch resumes");
  }
}
