import { logger } from "@/lib/logger";
// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Verify that the user can only access their own settings
    const requestedUserId = new URL(request.url).searchParams.get("userId");
    if (!requestedUserId) {
      return handleApiError(
        new Error("userId is required"),
        "userId is required",
        400
      );
    }

    if (userId !== requestedUserId) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot access other user's settings",
        403
      );
    }

    // Get user document using Admin SDK (bypasses Firestore security rules)
    const userDoc = await adminDb.collection("users").doc(userId!).get();

    if (!userDoc.exists) {
      return handleApiError(new Error("User not found"), "User not found", 404);
    }

    const userData = userDoc.data();

    // Ensure role field is in sync with isRecruiter (migration fix)
    const isRecruiter = userData?.isRecruiter || false;
    if (userData && userData.role === undefined) {
      // Update the document to include the role field
      await adminDb
        .collection("users")
        .doc(userId!)
        .set(
          { role: isRecruiter ? "recruiter" : "jobseeker" },
          { merge: true }
        );
    }

    const settings = {
      isRecruiter,
      displayName: userData?.displayName || "",
      companyName: userData?.companyName || "",
      updatedAt: userData?.settingsUpdatedAt || new Date().toISOString(),
    };

    return NextResponse.json(settings);
  } catch (error) {
    logger.error({ err: error }, "Error fetching user settings:");
    return handleApiError(error, "Failed to fetch settings");
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    let body;
    try {
      body = await request.json();
    } catch {
      return handleApiError(
        new Error("Invalid JSON"),
        "Invalid JSON in request body",
        400
      );
    }

    const {
      userId: requestedUserId,
      isRecruiter,
      companyName,
      displayName,
    } = body;

    if (!requestedUserId) {
      return handleApiError(
        new Error("userId is required"),
        "userId is required",
        400
      );
    }

    // Verify that the user can only update their own settings
    if (userId !== requestedUserId) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's settings",
        403
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      settingsUpdatedAt: new Date().toISOString(),
    };

    // Only add fields that were explicitly provided
    if (typeof isRecruiter === "boolean") {
      updateData.isRecruiter = isRecruiter;
      // Also update the role field to keep them in sync
      updateData.role = isRecruiter ? "recruiter" : "jobseeker";
    }
    if (companyName !== undefined && companyName !== null) {
      updateData.companyName = companyName;
    }
    if (displayName !== undefined && displayName !== null) {
      updateData.displayName = displayName;
    }

    // Use set with merge to create the document if it doesn't exist
    await adminDb
      .collection("users")
      .doc(userId!)
      .set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Error updating user settings:");
    return handleApiError(error, "Failed to update settings");
  }
}
