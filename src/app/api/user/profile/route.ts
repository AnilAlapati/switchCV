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
import {
  CreateUserProfileSchema,
  UpdateUserProfileSchema,
  UserProfileQuerySchema,
} from "@/lib/schemas/api";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const queryParseResult = UserProfileQuerySchema.safeParse({
      userId: new URL(request.url).searchParams.get("userId"),
    });
    if (!queryParseResult.success) {
      return handleApiError(
        queryParseResult.error,
        "userId is required",
        400
      );
    }
    const requestedUserId = queryParseResult.data.userId;

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
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Error fetching user profile:");
    return handleApiError(error, "Failed to fetch user profile");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const parseResult = CreateUserProfileSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "uid and email are required",
        400
      );
    }
    const body = parseResult.data;

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
    } catch (e: unknown) {
      if (String(e).startsWith("Validation failed")) {
        return handleApiError(e, "Invalid profile data", 400);
      }
      throw e;
    }

  } catch (error: unknown) {
    logger.error({ err: error }, "Error creating user profile:");
    return handleApiError(error, "Failed to create user profile");
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const parseResult = UpdateUserProfileSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "uid is required",
        400
      );
    }
    const body = parseResult.data;

    // Users can only update their own profile
    if (userId !== body.uid) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's profile",
        403
      );
    }

    try {
      const { uid, ...updates } = body;
      const updateData = await updateUserProfile(uid, updates);

      return NextResponse.json({
        success: true,
        message: "User profile updated successfully",
        data: updateData,
      });
    } catch (e: unknown) {
      if (String(e).startsWith("Validation failed")) {
        return handleApiError(e, "Invalid profile data", 400);
      }
      throw e;
    }

  } catch (error: unknown) {
    logger.error({ err: error }, "Error updating user profile:");
    return handleApiError(error, "Failed to update user profile");
  }
}
