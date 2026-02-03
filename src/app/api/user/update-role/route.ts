import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { z } from "zod";

const updateRoleSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  newRole: z.enum(["jobseeker", "recruiter"]),
  companyName: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const body = await request.json();

    // Validate input
    const validationResult = updateRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(
        new Error("Validation failed"),
        validationResult.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const { uid, newRole, companyName } = validationResult.data;

    // Users can only update their own role
    if (userId !== uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's role",
        403
      );
    }

    // Check current user document
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return handleApiError(
        new Error("User not found"),
        "User profile not found",
        404
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      role: newRole,
      isRecruiter: newRole === "recruiter",
      updatedAt: now,
      roleUpdatedAt: now,
    };

    // Only add company name if switching to recruiter
    if (newRole === "recruiter" && companyName) {
      updateData.companyName = companyName;
    } else if (newRole === "jobseeker") {
      updateData.companyName = "";
    }

    // Update user document with new role
    await adminDb.collection("users").doc(uid).update(updateData);

    // Also update custom claims in Auth to sync role across services
    try {
      await adminAuth.setCustomUserClaims(uid, { role: newRole });
      logger.info(
        { userId: uid, newRole },
        "Role updated and custom claims set"
      );
    } catch (claimsError) {
      logger.warn(
        { userId: uid, err: claimsError },
        "Failed to update custom claims, but role was updated in Firestore"
      );
      // Don't fail the whole operation if custom claims fail
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${newRole}`,
      data: {
        uid,
        role: newRole,
        isRecruiter: newRole === "recruiter",
        updatedAt: now,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Error updating user role:");
    return handleApiError(error, "Failed to update user role");
  }
}
