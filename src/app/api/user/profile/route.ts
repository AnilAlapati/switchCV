import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile
} from "@/lib/services/userService";

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

    const userData = await getUserProfile(userId!);

    if (!userData) {
      return handleApiError(
        new Error("User profile not found"),
        "User profile not found",
        404
      );
    }

    return NextResponse.json(userData, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      },
    });
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

    // Users can only create profiles for themselves
    if (userId !== body.uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot create profiles for other users",
        403
      );
    }

    // Delegate to Service
    try {
      const userProfileData = await createUserProfile(body);

      return NextResponse.json({
        success: true,
        message: "User profile created successfully",
        data: userProfileData,
      });
    } catch (e: any) {
      if (e.message.startsWith("Validation failed")) {
        return handleApiError(e, e.message, 400);
      }
      throw e;
    }

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

    // Users can only update their own profile
    if (userId !== body.uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's profile",
        403
      );
    }

    try {
      const updateData = await updateUserProfile(body.uid, body);

      return NextResponse.json({
        success: true,
        message: "User profile updated successfully",
        data: updateData,
      });
    } catch (e: any) {
      if (e.message.startsWith("Validation failed")) {
        return handleApiError(e, e.message, 400);
      }
      throw e;
    }

  } catch (error) {
    logger.error({ err: error }, "Error updating user profile:");
    return handleApiError(error, "Failed to update user profile");
  }
}
