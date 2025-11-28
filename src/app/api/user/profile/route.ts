import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { z } from "zod";

// Define validation schemas
// SECURITY: subscriptionTier and isRecruiter are NOT accepted from clients
// These must be set server-side via admin operations or payment webhooks
const userProfileSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().optional(),
  companyName: z.string().optional(),
  // isRecruiter and subscriptionTier intentionally omitted - server-controlled
});

// SECURITY: Update schema excludes tier/role fields - only admin can change these
const updateProfileSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  displayName: z.string().optional(),
  companyName: z.string().optional(),
  // isRecruiter and subscriptionTier intentionally omitted - server-controlled
});

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isRecruiter: boolean;
  companyName?: string;
  subscriptionTier: "basic" | "premium" | "enterprise";
  createdAt?: string;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId) {
      return handleApiError(
        new Error("userId is required"),
        "userId is required",
        400
      );
    }

    // Users can only access their own profile
    if (userId !== requestedUserId) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot access other user's profile",
        403
      );
    }

    const userDoc = await adminDb.collection("users").doc(userId!).get();

    if (!userDoc.exists) {
      return handleApiError(
        new Error("User profile not found"),
        "User profile not found",
        404
      );
    }

    return NextResponse.json(userDoc.data());
  } catch (error) {
    logger.error({ err: error }, "Error fetching user profile:");
    return handleApiError(error, "Failed to fetch user profile");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const body = await request.json();

    if (!body?.uid || !body?.email) {
      return handleApiError(
        new Error("uid and email are required"),
        "uid and email are required",
        400
      );
    }

    // Validate input using Zod
    const validationResult = userProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return handleApiError(
        new Error("Validation failed"),
        (validationResult.error as any).errors
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const { uid, email, displayName, companyName } = validationResult.data;

    // Users can only create profiles for themselves
    if (userId !== uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot create profiles for other users",
        403
      );
    }

    const now = new Date().toISOString();
    // SECURITY: isRecruiter and subscriptionTier are server-controlled
    // New users always start as basic jobseekers
    const userProfileData: UserProfile = {
      uid,
      email,
      displayName: displayName || "",
      isRecruiter: false, // Server-controlled: set via admin or recruiter verification
      companyName: companyName || "",
      subscriptionTier: "basic", // Server-controlled: set via payment webhooks
      createdAt: now,
      updatedAt: now,
    };

    await adminDb
      .collection("users")
      .doc(uid)
      .set(userProfileData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
      data: userProfileData,
    });
  } catch (error) {
    logger.error({ err: error }, "Error creating user profile:");
    return handleApiError(error, "Failed to create user profile");
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const body = await request.json();

    if (!body?.uid) {
      return handleApiError(
        new Error("uid is required"),
        "uid is required",
        400
      );
    }

    // Validate input using Zod
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return handleApiError(
        new Error("Validation failed"),
        (validationResult.error as any).errors
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        400
      );
    }

    const { uid, displayName, companyName } = validationResult.data;

    // Users can only update their own profile
    if (userId !== uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's profile",
        403
      );
    }

    // SECURITY: Users can only update display name and company name
    // isRecruiter and subscriptionTier are server-controlled
    const updateData: Partial<UserProfile> = {
      updatedAt: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (companyName !== undefined) updateData.companyName = companyName;
    // NOTE: isRecruiter and subscriptionTier intentionally not updated from client
    // Use /api/admin/update-user-tier or payment webhooks for these fields

    await adminDb.collection("users").doc(uid).set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully",
      data: updateData,
    });
  } catch (error) {
    logger.error({ err: error }, "Error updating user profile:");
    return handleApiError(error, "Failed to update user profile");
  }
}
